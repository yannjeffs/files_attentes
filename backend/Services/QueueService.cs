using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public class QueueService
{
    private readonly AppDbContext _context;

    public QueueService(AppDbContext context)
    {
        _context = context;
    }

    // Génère le numéro de ticket comme par exemple C-001 ou R-012
    public async Task<string> GenerateTicketNumberAsync(int serviceId)
    {
        var service = await _context.Services.FindAsync(serviceId) ?? throw new Exception("Service introuvable");

        // Compter les tickets du jour pour ce service
        var today = DateTime.UtcNow.Date;
        var ticketCount = await _context.Tickets
            .Where(t => t.ServiceId == serviceId && t.IssuedAt.Date == today)
            .CountAsync();

        // Générer le numéro de ticket au format "CODE-XXX"
        return $"{service.Code}-{(ticketCount + 1).ToString("D3")}";
    }

    // Calcule le temps d'attente estimé en minutes pour un ticket donné
    public async Task<int> EstimateWaitTimeAsync(int serviceId)
    {
        var waitingTickets = await _context.Tickets
            .Where(t => t.ServiceId == serviceId && t.Status == TicketStatus.Waiting)
            .CountAsync();

        // Estimation: 5 minutes par ticket en attente
        return waitingTickets * 5;
    }

    // Calcule la position d'un ticket dans sa file
    // Retourne le nombre de personnes avant le ticket donné
    public async Task<int> GetPositionAsync(int ticketId)
    {
        // On charge le ticket
        var ticket = await _context.Tickets
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null) return 0;

        // On compte les tickets qui passent avant lui
        // selon les règles de priorité et d'ordre d'arrivée
        var peopleAhead = await _context.Tickets
            .Where(t =>
                t.ServiceId == ticket.ServiceId &&
                t.Status == TicketStatus.Waiting &&
                t.Id != ticket.Id &&
                (
                    (ticket.Priority == TicketPriority.Normal &&
                     t.Priority == TicketPriority.VIP) ||
                    (t.Priority == ticket.Priority &&
                     t.IssuedAt < ticket.IssuedAt)
                )
            )
            .CountAsync();

        return peopleAhead;
    }

    // Récupère le prochain ticket en attente pour un service donné
    public async Task<Ticket?> GetNextTicketAsync(int serviceId)
    {
        // Les VIP passent en premier, puis l'ordre d'arrivée
        return await _context.Tickets
            .Where(t => t.ServiceId == serviceId && t.Status == TicketStatus.Waiting)
            .OrderByDescending(t => t.Priority == TicketPriority.VIP) // Les VIP en premier
            .ThenBy(t => t.IssuedAt) // Puis par ordre d'arrivée
            .FirstOrDefaultAsync();
    }
}
