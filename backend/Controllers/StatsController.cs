using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class StatsController : ControllerBase
{
    private readonly AppDbContext _context;

    public StatsController(AppDbContext context)
    {
        _context = context;
    }

    // GET api/stats/dashboard?agencyId=1
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] int agencyId)
    {
        var today = DateTime.UtcNow.Date;

        // Tickets d'aujourd'hui pour cette agence
        // On passe par le service pour récupérer l'agencyId
        var todayTickets = await _context.Tickets
            .Include(t => t.Service)
            .Where(t =>
                t.Service.AgencyId == agencyId &&
                t.IssuedAt.Date == today)
            .ToListAsync();

        // Tickets en attente
        var waitingCount = todayTickets
            .Count(t => t.Status == TicketStatus.Waiting);

        // Tickets en cours de traitement
        var inServiceCount = todayTickets
            .Count(t => t.Status == TicketStatus.Called ||
                        t.Status == TicketStatus.InProgress);

        // Tickets traités aujourd'hui
        var servedCount = todayTickets
            .Count(t => t.Status == TicketStatus.Done);

        // Tickets No Show aujourd'hui
        var noShowCount = todayTickets
            .Count(t => t.Status == TicketStatus.NoShow);

        // Nombre total de guichets actifs
        var totalCounters = await _context.Counters
            .CountAsync(c => c.AgencyId == agencyId && c.IsActive);

        // Temps moyen d'attente en minutes
        // = moyenne de (CalledAt - IssuedAt) pour les tickets appelés
        var calledTickets = todayTickets
            .Where(t => t.CalledAt.HasValue)
            .ToList();

        var averageWaitTime = calledTickets.Any()
            ? calledTickets
                .Average(t => (t.CalledAt!.Value - t.IssuedAt).TotalMinutes)
            : 0;

        // Temps moyen de traitement en minutes
        // = moyenne de (EndedAt - StartedAt) pour les tickets terminés
        var doneTickets = todayTickets
            .Where(t => t.StartedAt.HasValue && t.EndedAt.HasValue)
            .ToList();

        var averageServiceTime = doneTickets.Any()
            ? doneTickets
                .Average(t => (t.EndedAt!.Value - t.StartedAt!.Value).TotalMinutes)
            : 0;

        return Ok(new
        {
            waitingCount,
            inServiceCount,
            servedCount,
            noShowCount,
            totalCounters,
            averageWaitTime = Math.Round(averageWaitTime, 1),
            averageServiceTime = Math.Round(averageServiceTime, 1),
        });
    }

    // GET api/stats/tickets-by-day?agencyId=1&days=7
    [HttpGet("tickets-by-day")]
    public async Task<IActionResult> GetTicketsByDay(
        [FromQuery] int agencyId,
        [FromQuery] int days = 7)
    {
        var startDate = DateTime.UtcNow.Date.AddDays(-days + 1);

        var tickets = await _context.Tickets
            .Include(t => t.Service)
            .Where(t =>
                t.Service.AgencyId == agencyId &&
                t.IssuedAt.Date >= startDate)
            .ToListAsync();

        // Grouper par jour
        var result = Enumerable.Range(0, days)
            .Select(i =>
            {
                var date = startDate.AddDays(i);
                var dayTickets = tickets
                    .Where(t => t.IssuedAt.Date == date)
                    .ToList();

                return new
                {
                    // Format JJ/MM pour l'affichage dans le graphique
                    date = date.ToString("dd/MM"),
                    total = dayTickets.Count,
                    served = dayTickets
                        .Count(t => t.Status == TicketStatus.Done),
                    noShow = dayTickets
                        .Count(t => t.Status == TicketStatus.NoShow),
                };
            })
            .ToList();

        return Ok(result);
    }
}