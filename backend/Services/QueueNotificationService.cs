using backend.DTOs;
using backend.Hubs;
using backend.Models;
using Microsoft.AspNetCore.SignalR;

namespace backend.Services;

public class QueueNotificationService
{
    private readonly IHubContext<QueueHub> _hubContext;

    public QueueNotificationService(IHubContext<QueueHub> hubContext)
    {
        _hubContext = hubContext;
    }

    // Notifie lorsqu'un ticket est crée
    public async Task NotifyTicketCreatedAsync(int agencyId, TicketResponseDto ticket)
    {
        await _hubContext.Clients
            .Group($"agency-{agencyId}")
            .SendAsync("TicketCreated", ticket);
    }

    // Notifie lorsqu'un ticket est appelé
    public async Task NotifyTicketCalledAsync(int agencyId, TicketResponseDto ticket)
    {
        await _hubContext.Clients
            .Group($"agency-{agencyId}")
            .SendAsync("TicketCalled", ticket);
    }

    // Notifie lorsqu'un ticket est en cours de traitement
    public async Task NotifyTicketStartedAsync(int agencyId, TicketResponseDto ticket)
    {
        await _hubContext.Clients
            .Group($"agency-{agencyId}")
            .SendAsync("TicketStarted", ticket);
    }

    // Notifie lorsqu'un ticket est terminé
    public async Task NotifyTicketCompletedAsync(int agencyId, TicketResponseDto ticket)
    {
        await _hubContext.Clients
            .Group($"agency-{agencyId}")
            .SendAsync("TicketCompleted", ticket);
    }

    // Notifie lorsqu'un ticket est No Show
    public async Task NotifyTicketNoShowAsync(int agencyId, TicketResponseDto ticket)
    {
        await _hubContext.Clients
            .Group($"agency-{agencyId}")
            .SendAsync("TicketNoShow", ticket);
    }

    // Notifie lorsqu'un ticket est tranféré
    public async Task NotifyTicketTransferredAsync(int agencyId, TicketResponseDto ticket)
    {
        await _hubContext.Clients
            .Group($"agency-{agencyId}")
            .SendAsync("TicketTransferred", ticket);
    }
}
