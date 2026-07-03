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
[Authorize]
public class TicketsController : ControllerBase
{
    private readonly QueueService _queueService;
    private readonly AppDbContext _context;

    public TicketsController(QueueService queueService, AppDbContext context)
    {
        _queueService = queueService;
        _context = context;
    }

    // POST: api/tickets
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TicketCreateDto dto)
    {
        // Vérifier si le service existe et est actif
        var service = await _context.Services.FindAsync(dto.ServiceId);
        if (service == null || !service.IsActive)
            return BadRequest(new { message = "Service introuvable ou inactif." });

        // Parser la priorité
        if (!Enum.TryParse<TicketPriority>(dto.Priority, out var priority))
            priority = TicketPriority.Normal; // Valeur par défaut si la priorité est invalide

        // Créer ou retrouver le client
        var client = await _context.Clients
            .FirstOrDefaultAsync(c => c.Phone == dto.Phone && c.FirstName == dto.FirstName && c.LastName == dto.LastName);

        client ??= new Client
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Phone = dto.Phone,
            Email = dto.Email,
            AccountNumber = dto.AccountNumber
        };

        _context.Clients.Add(client);
        await _context.SaveChangesAsync();

        // Générer le numéro de ticket
        var ticketNumber = await _queueService.GenerateTicketNumberAsync(dto.ServiceId);

        // Calculer le temps d'attente estimé
        var estimatedWaitTime = await _queueService.EstimateWaitTimeAsync(dto.ServiceId);

        // Créer le ticket
        var ticket = new Ticket
        {
            ServiceId = dto.ServiceId,
            ClientId = client.Id,
            TicketNumber = ticketNumber,
            Status = TicketStatus.Waiting,
            Priority = priority,
            IssuedAt = DateTime.UtcNow,
            EstimatedWaitTime = estimatedWaitTime
        };

        _context.Tickets.Add(ticket);
        await _context.SaveChangesAsync();

        // Recharger avec les relations pour la réponse
        await _context.Entry(ticket).Reference(t => t.Service).LoadAsync();
        await _context.Entry(ticket).Reference(t => t.Client).LoadAsync();

        return CreatedAtAction(nameof(GetById), new { id = ticket.Id }, MapToResponseDto(ticket));
    }

    // GET: api/tickets/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var ticket = await _context.Tickets
            .Include(t => t.Service)
            .Include(t => t.Client)
            .Include(t => t.Agent)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        return Ok(MapToResponseDto(ticket));
    }

    // GET: api/tickets/queue/{serviceId} - File d'attente pour un service donné
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
                   (t.Status == TicketStatus.Waiting || t.Status == TicketStatus.Called))
            .OrderByDescending(t => t.Priority == TicketPriority.VIP)
            .ThenBy(t => t.IssuedAt)
            .ToListAsync();

        var ticketDtos = tickets.Select(MapToResponseDto);
        return Ok(ticketDtos);
    }

    // PUT: api/tickets/{id}/call - Appel du client suivant
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
            return BadRequest(new { message = "Le ticket n'est pas en attente." });

        // Récupérer l'agent connecté
        var agentId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        ticket.Status = TicketStatus.Called;
        ticket.CalledAt = DateTime.UtcNow;
        ticket.AgentId = agentId;

        await _context.SaveChangesAsync();

        return Ok(MapToResponseDto(ticket));
    }

    // PUT: api/tickets/{id}/start - Début du service pour le ticket
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
            return BadRequest(new { message = "Le ticket n'a pas encore été appelé." });

        ticket.Status = TicketStatus.InProgress;
        ticket.StartedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(MapToResponseDto(ticket));
    }

    // PUT api/tickets/{id}/complete — Agent termine le traitement
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

        return Ok(MapToResponseDto(ticket));
    }

    // PUT api/tickets/{id}/noshow — Client absent
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

        return Ok(MapToResponseDto(ticket));
    }

    // PUT api/tickets/{id}/cancel — Annuler un ticket
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

    // PUT api/tickets/{id}/transfer — Transférer vers un autre service
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

        // Marquer l'ancien ticket comme transféré
        ticket.Status = TicketStatus.Transferred;
        ticket.EndedAt = DateTime.UtcNow;

        // Créer un nouveau ticket dans le nouveau service
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

        return Ok(new
        {
            message = "Ticket transféré avec succès.",
            newTicketNumber = newTicketNumber
        });
    }


    // Méthode utilitaire de mappage d'un Ticket vers un TicketResponseDto
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