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
    private readonly WhatsAppService _whatsAppService;

    public TicketsController(
        AppDbContext context,
        QueueService queueService,
        QueueNotificationService notificationService,
        WhatsAppService whatsAppService)
    {
        _context = context;
        _queueService = queueService;
        _notificationService = notificationService;
        _whatsAppService = whatsAppService;
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
        await _whatsAppService.SendTicketConfirmationAsync(ticket);

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

        var agentId = int.Parse(
            User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

        ticket.Status = TicketStatus.Called;
        ticket.CalledAt = DateTime.UtcNow;
        ticket.AgentId = agentId;

        await _context.SaveChangesAsync();
        await _context.Entry(ticket).Reference(t => t.Agent).LoadAsync();

        var ticketDto = MapToResponseDto(ticket);

        // 1. Notifier via SignalR tous les écrans connectés
        await _notificationService.NotifyTicketCalledAsync(
            ticket.Service.AgencyId, ticketDto);

        // 2. Notifier le client appelé sur WhatsApp
        await _whatsAppService.SendTicketCalledAsync(ticket);

        // 3. Récupérer tous les tickets encore en attente
        //    dans le même service
        var waitingTickets = await _context.Tickets
            .Where(t =>
                t.ServiceId == ticket.ServiceId &&
                t.Status == TicketStatus.Waiting)
            .ToListAsync();

        // 4. Pour chaque ticket en attente, recalculer sa position
        //    et envoyer une notification WhatsApp si un seuil est atteint
        //
        //    On définit les seuils : 5, 3, 1
        //    Si la nouvelle position correspond à un seuil → on notifie
        var seuils = new[] { 5, 3, 1 };

        foreach (var waitingTicket in waitingTickets)
        {
            // Calculer combien de personnes sont encore avant ce ticket
            var peopleAhead = await _queueService.GetPositionAsync(waitingTicket.Id);

            // Vérifier si la nouvelle position correspond à un seuil
            if (seuils.Contains(peopleAhead))
            {
                // Envoyer la notification WhatsApp de progression
                await _whatsAppService.SendPositionUpdateAsync(
                    waitingTicket, peopleAhead);
            }

            // Notifier aussi via SignalR pour mettre à jour
            // la position sur la page de suivi web du client
            await _notificationService.NotifyPositionUpdatedAsync(
                ticket.Service.AgencyId,
                waitingTicket.Id,
                peopleAhead);
        }

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

        // SignalR — notifier tous les écrans
        await _notificationService.NotifyTicketCompletedAsync(
            ticket.Service.AgencyId, ticketDto);

        // WhatsApp — notifier le client que c'est terminé
        //            + envoyer le lien de notation
        await _whatsAppService.SendRatingRequestAsync(ticket);

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

    // GET api/tickets/{id}/position — Public
    [HttpGet("{id}/position")]
    public async Task<IActionResult> GetPosition(int id)
    {
        // 1. On cherche le ticket demandé
        var ticket = await _context.Tickets
            .Include(t => t.Counter)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        // 2. Si le ticket est déjà terminé, on retourne son statut final
        //    sans calculer de position — il n'est plus dans la file
        if (ticket.Status == TicketStatus.Done ||
            ticket.Status == TicketStatus.Cancelled ||
            ticket.Status == TicketStatus.NoShow ||
            ticket.Status == TicketStatus.Transferred)
        {
            return Ok(new TicketPositionDto
            {
                Position = 0,
                PeopleAhead = 0,
                EstimatedWaitTime = 0,
                Status = ticket.Status.ToString(),
                CounterNumber = ticket.Counter?.Number
            });
        }

        // 3. Si le ticket est appelé (CALLED), c'est le tour du client
        if (ticket.Status == TicketStatus.Called ||
            ticket.Status == TicketStatus.InProgress)
        {
            return Ok(new TicketPositionDto
            {
                Position = 0,
                PeopleAhead = 0,
                EstimatedWaitTime = 0,
                Status = ticket.Status.ToString(),
                CounterNumber = ticket.Counter?.Number
            });
        }

        // 4. On compte le nombre de tickets WAITING créés AVANT le nôtre
        //    dans le même service
        //
        //    Pourquoi "IssuedAt < ticket.IssuedAt" ?
        //    Parce qu'on veut les tickets arrivés avant nous dans la file.
        //    On exclut les tickets VIP si notre ticket est Normal
        //    (les VIP passeront avant nous)
        var peopleAhead = await _context.Tickets
            .Where(t =>
                t.ServiceId == ticket.ServiceId &&    // même service
                t.Status == TicketStatus.Waiting &&   // encore en attente
                t.Id != ticket.Id &&                  // pas nous-même
                (
                    // Un ticket VIP passe toujours avant un ticket Normal
                    (ticket.Priority == TicketPriority.Normal &&
                     t.Priority == TicketPriority.VIP) ||
                    // À priorité égale, c'est l'ordre d'arrivée qui compte
                    (t.Priority == ticket.Priority &&
                     t.IssuedAt < ticket.IssuedAt)
                )
            )
            .CountAsync();

        // 5. La position dans la file = nombre de personnes avant + 1
        //    Ex: 2 personnes avant → tu es en position 3
        var position = peopleAhead + 1;

        // 6. On estime le temps d'attente : 5 minutes par personne en attente
        //    C'est une estimation simple — en production on pourrait
        //    utiliser la moyenne des temps de traitement réels
        var estimatedWait = peopleAhead * 5;

        return Ok(new TicketPositionDto
        {
            Position = position,
            PeopleAhead = peopleAhead,
            EstimatedWaitTime = estimatedWait,
            Status = ticket.Status.ToString(),
            CounterNumber = null
        });
    }

    // PUT api/tickets/{id}/update-client — Public
    [HttpPut("{id}/update-client")]
    public async Task<IActionResult> UpdateClient(
        int id,
        [FromBody] TicketUpdateClientDto dto)
    {
        // 1. On charge le ticket avec son client associé
        var ticket = await _context.Tickets
            .Include(t => t.Client)
            .Include(t => t.Service)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        // 2. On vérifie que le ticket est encore modifiable
        //    Un ticket ne peut être modifié que s'il est encore en attente
        //    Une fois appelé, en cours ou terminé — on ne peut plus modifier
        if (ticket.Status != TicketStatus.Waiting)
            return BadRequest(new
            {
                message = "Ce ticket ne peut plus être modifié — " +
                          "il n'est plus en attente."
            });

        // 3. On vérifie que le client existe bien
        //    (normalement oui, mais on vérifie par sécurité)
        if (ticket.Client == null)
            return BadRequest(new { message = "Client introuvable." });

        // 4. On met à jour uniquement les champs de contact
        //    On garde l'ancien téléphone si le nouveau est vide
        if (!string.IsNullOrWhiteSpace(dto.Phone))
            ticket.Client.Phone = dto.Phone.Trim();

        // Email : on accepte null ou vide (suppression de l'email)
        ticket.Client.Email = string.IsNullOrWhiteSpace(dto.Email)
            ? null
            : dto.Email.Trim();

        // 5. On sauvegarde les modifications
        await _context.SaveChangesAsync();

        // 6. On retourne le ticket mis à jour
        await _context.Entry(ticket).Reference(t => t.Service).LoadAsync();

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