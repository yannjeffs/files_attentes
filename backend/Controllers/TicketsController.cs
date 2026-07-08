using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly QueueService _queueService;
    private readonly QueueNotificationService _notificationService;
    private readonly WhatsAppService _whatsAppservice;

    public TicketsController(
        AppDbContext context,
        QueueService queueService,
        QueueNotificationService notificationService,
        WhatsAppService whatsAppService)
    {
        _context = context;
        _queueService = queueService;
        _notificationService = notificationService;
        _whatsAppservice = whatsAppService;
    }

    // POST api/tickets
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TicketCreateDto dto)
    {
        var service = await _context.Services
            .Include(s => s.Agency)
            .FirstOrDefaultAsync(s => s.Id == dto.ServiceId);

        if (service == null || !service.IsActive)
            return BadRequest(new { message = "Service introuvable ou inactif." });

        var priority = TicketPriority.Normal;

        var client = await _context.Clients
            .FirstOrDefaultAsync(c => c.Phone == dto.Phone);

        if (client == null)
        {
            client = new Client
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Phone = dto.Phone,
                Email = dto.Email,
                AccountNumber = dto.AccountNumber
            };
            _context.Clients.Add(client);
            await _context.SaveChangesAsync();
        }

        var ticketNumber = await _queueService.GenerateTicketNumberAsync(dto.ServiceId);
        var estimatedWait = await _queueService.EstimateWaitTimeAsync(dto.ServiceId);

        var ticket = new Ticket
        {
            ServiceId = dto.ServiceId,
            ClientId = client.Id,
            TicketNumber = ticketNumber,
            Source = TicketSource.Web,
            Status = TicketStatus.Waiting,
            Priority = priority,
            EstimatedWaitTime = estimatedWait
        };

        _context.Tickets.Add(ticket);
        await _context.SaveChangesAsync();

        await _context.Entry(ticket).Reference(t => t.Service).LoadAsync();
        await _context.Entry(ticket).Reference(t => t.Client).LoadAsync();

        var ticketDto = MapToResponseDto(ticket);

        // Notifier via SignalR
        await _notificationService.NotifyTicketCreatedAsync(service.AgencyId, ticketDto);

        // WhatsApp - confirmation immédiate
        await _whatsAppservice.SendTicketConfirmationAsync(ticket);

        return CreatedAtAction(nameof(GetById), new { id = ticket.Id }, ticketDto);
    }

    // PUT api/tickets/{id}/call
    [HttpPut("{id}/call")]
    [Authorize(Roles = "Agent,Admin")]
    public async Task<IActionResult> Call(int id)
    {
        var ticket = await _context.Tickets
            .Include(t => t.Service)
            .Include(t => t.Client)
            .Include(t => t.Counter)
            .Include(t => t.Agent)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        if (ticket.Status != TicketStatus.Waiting)
            return BadRequest(new { message = "Ce ticket n'est pas en attente." });

        var agentId = int.Parse(User.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        ticket.Status = TicketStatus.Called;
        ticket.CalledAt = DateTime.UtcNow;
        ticket.AgentId = agentId;

        await _context.SaveChangesAsync();
        await _context.Entry(ticket).Reference(t => t.Agent).LoadAsync();

        var ticketDto = MapToResponseDto(ticket);

        // Notifier via SignalR
        await _notificationService.NotifyTicketCalledAsync(ticket.Service.AgencyId, ticketDto);

        // WhatsApp - Notification d'appel
        await _whatsAppservice.SendTicketConfirmationAsync(ticket);

        return Ok(ticketDto);
    }

    // PUT api/tickets/{id}/start
    [HttpPut("{id}/start")]
    [Authorize(Roles = "Agent,Admin")]
    public async Task<IActionResult> Start(int id)
    {
        var ticket = await _context.Tickets
            .Include(t => t.Service)
            .Include(t => t.Client)
            .Include(t => t.Counter)
            .Include(t => t.Agent)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        if (ticket.Status != TicketStatus.Called)
            return BadRequest(new { message = "Ce ticket n'a pas encore été appelé." });

        ticket.Status = TicketStatus.InProgress;
        ticket.StartedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var ticketDto = MapToResponseDto(ticket);

        // Notifier via SignalR
        await _notificationService.NotifyTicketStartedAsync(ticket.Service.AgencyId, ticketDto);

        return Ok(ticketDto);
    }

    // PUT api/tickets/{id}/complete
    [HttpPut("{id}/complete")]
    [Authorize(Roles = "Agent,Admin")]
    public async Task<IActionResult> Complete(int id)
    {
        var ticket = await _context.Tickets
            .Include(t => t.Service)
            .Include(t => t.Client)
            .Include(t => t.Counter)
            .Include(t => t.Agent)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        if (ticket.Status != TicketStatus.InProgress)
            return BadRequest(new { message = "Ce ticket n'est pas en cours de traitement." });

        ticket.Status = TicketStatus.Done;
        ticket.EndedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var ticketDto = MapToResponseDto(ticket);

        // Notifier via SignalR
        await _notificationService.NotifyTicketCompletedAsync(ticket.Service.AgencyId, ticketDto);

        return Ok(ticketDto);
    }

    // PUT api/tickets/{id}/noshow
    [HttpPut("{id}/noshow")]
    [Authorize(Roles = "Agent,Admin")]
    public async Task<IActionResult> NoShow(int id)
    {
        var ticket = await _context.Tickets
            .Include(t => t.Service)
            .Include(t => t.Client)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        if (ticket.Status != TicketStatus.Called)
            return BadRequest(new { message = "Ce ticket n'a pas encore été appelé." });

        ticket.Status = TicketStatus.NoShow;
        ticket.EndedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var ticketDto = MapToResponseDto(ticket);

        // Notifier via SignalR
        await _notificationService.NotifyTicketNoShowAsync(ticket.Service.AgencyId, ticketDto);

        return Ok(ticketDto);
    }

    // PUT api/tickets/{id}/cancel
    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var ticket = await _context.Tickets
            .Include(t => t.Service)
            .Include(t => t.Client)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        if (ticket.Status != TicketStatus.Waiting)
            return BadRequest(new { message = "Seuls les tickets en attente peuvent être annulés." });

        ticket.Status = TicketStatus.Cancelled;
        ticket.EndedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Ticket annulé avec succès." });
    }

    // PUT api/tickets/{id}/transfer
    [HttpPut("{id}/transfer")]
    [Authorize(Roles = "Agent,Admin")]
    public async Task<IActionResult> Transfer(int id, [FromBody] TicketTransferDto dto)
    {
        var ticket = await _context.Tickets
            .Include(t => t.Service)
            .Include(t => t.Client)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        var newService = await _context.Services.FindAsync(dto.NewServiceId);
        if (newService == null || !newService.IsActive)
            return BadRequest(new { message = "Service de destination introuvable ou inactif." });

        ticket.Status = TicketStatus.Transferred;
        ticket.EndedAt = DateTime.UtcNow;

        var newTicketNumber = await _queueService.GenerateTicketNumberAsync(dto.NewServiceId);
        var estimatedWait = await _queueService.EstimateWaitTimeAsync(dto.NewServiceId);

        var newTicket = new Ticket
        {
            ServiceId = dto.NewServiceId,
            ClientId = ticket.ClientId,
            TicketNumber = newTicketNumber,
            Source = ticket.Source,
            Status = TicketStatus.Waiting,
            Priority = ticket.Priority,
            EstimatedWaitTime = estimatedWait
        };

        _context.Tickets.Add(newTicket);
        await _context.SaveChangesAsync();

        await _notificationService.NotifyTicketTransferredAsync(
            ticket.Service.AgencyId,
            MapToResponseDto(ticket));

        return Ok(new
        {
            message = "Ticket transféré avec succès.",
            newTicketNumber = newTicketNumber
        });
    }

    // GET api/tickets/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var ticket = await _context.Tickets
            .Include(t => t.Service)
            .Include(t => t.Client)
            .Include(t => t.Counter)
            .Include(t => t.Agent)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        return Ok(MapToResponseDto(ticket));
    }

    // GET api/tickets/queue/{serviceId}
    [HttpGet("queue/{serviceId}")]
    [Authorize]
    public async Task<IActionResult> GetQueue(int serviceId)
    {
        var tickets = await _context.Tickets
            .Include(t => t.Service)
            .Include(t => t.Client)
            .Include(t => t.Counter)
            .Include(t => t.Agent)
            .Where(t => t.ServiceId == serviceId &&
                   (t.Status == TicketStatus.Waiting ||
                    t.Status == TicketStatus.Called))
            .OrderByDescending(t => t.Priority == TicketPriority.VIP)
            .ThenBy(t => t.IssuedAt)
            .ToListAsync();

        return Ok(tickets.Select(MapToResponseDto));
    }

    private static TicketResponseDto MapToResponseDto(Ticket ticket)
    {
        return new TicketResponseDto
        {
            Id = ticket.Id,
            TicketNumber = ticket.TicketNumber,
            ServiceName = ticket.Service?.Name ?? string.Empty,
            ServiceCode = ticket.Service?.Code ?? string.Empty,
            ClientName = $"{ticket.Client?.FirstName} {ticket.Client?.LastName}",
            ClientPhone = ticket.Client?.Phone ?? string.Empty,
            Status = ticket.Status.ToString(),
            Priority = ticket.Priority.ToString(),
            Source = ticket.Source.ToString(),
            EstimatedWaitTime = ticket.EstimatedWaitTime,
            CounterNumber = ticket.Counter?.Number,
            AgentName = ticket.Agent != null
                ? $"{ticket.Agent.FirstName} {ticket.Agent.LastName}"
                : null,
            IssuedAt = ticket.IssuedAt,
            CalledAt = ticket.CalledAt,
            StartedAt = ticket.StartedAt,
            EndedAt = ticket.EndedAt
        };
    }
}