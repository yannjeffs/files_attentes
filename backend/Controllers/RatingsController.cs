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
public class RatingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly WhatsAppService _whatsAppService;

    public RatingsController(
        AppDbContext context,
        WhatsAppService whatsAppService)
    {
        _context = context;
        _whatsAppService = whatsAppService;
    }

    // ─────────────────────────────────────────────────────────────────
    // POST api/ratings/{ticketId}
    // Public — le client note son passage après que son ticket est Done
    // ─────────────────────────────────────────────────────────────────
    [HttpPost("{ticketId}")]
    public async Task<IActionResult> Create(
        int ticketId,
        [FromBody] RatingCreateDto dto)
    {
        // 1. Vérifier que le ticket existe et est bien terminé
        //    Un client ne peut noter que si son service a été rendu
        //    Les statuts Done sont les seuls acceptés
        var ticket = await _context.Tickets
            .Include(t => t.Service)
            .Include(t => t.Client)
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null)
            return NotFound(new { message = "Ticket introuvable." });

        if (ticket.Status != TicketStatus.Done)
            return BadRequest(new
            {
                message = "Vous ne pouvez noter que les tickets traités avec succès."
            });

        // 2. Vérifier que ce ticket n'a pas déjà été noté
        //    Un client ne peut noter qu'une seule fois par ticket
        var existingRating = await _context.Ratings
            .FirstOrDefaultAsync(r => r.TicketId == ticketId);

        if (existingRating != null)
            return BadRequest(new
            {
                message = "Vous avez déjà noté ce passage.",
                ratingId = existingRating.Id
            });

        // 3. Valider la note — doit être entre 1 et 5
        if (dto.Score < 1 || dto.Score > 5)
            return BadRequest(new
            {
                message = "La note doit être comprise entre 1 et 5."
            });

        // 4. Créer la notation
        var rating = new Rating
        {
            TicketId = ticketId,
            Score = dto.Score,
            Comment = dto.Comment?.Trim(),
        };

        _context.Ratings.Add(rating);
        await _context.SaveChangesAsync();

        // 5. Recharger avec les relations pour la réponse
        await _context.Entry(rating)
            .Reference(r => r.Ticket).LoadAsync();

        return CreatedAtAction(
            nameof(GetByTicket),
            new { ticketId = rating.TicketId },
            MapToResponseDto(rating));
    }

    // ─────────────────────────────────────────────────────────────────
    // GET api/ratings/ticket/{ticketId}
    // Public — vérifie si un ticket a déjà été noté
    // Utilisé par le frontend pour afficher ou masquer le formulaire
    // ─────────────────────────────────────────────────────────────────
    [HttpGet("ticket/{ticketId}")]
    public async Task<IActionResult> GetByTicket(int ticketId)
    {
        var rating = await _context.Ratings
            .Include(r => r.Ticket)
                .ThenInclude(t => t.Service)
            .Include(r => r.Ticket)
                .ThenInclude(t => t.Client)
            .FirstOrDefaultAsync(r => r.TicketId == ticketId);

        if (rating == null)
            return NotFound(new { message = "Aucune notation trouvée pour ce ticket." });

        return Ok(MapToResponseDto(rating));
    }

    // ─────────────────────────────────────────────────────────────────
    // GET api/ratings?agencyId=1&page=1&pageSize=10
    // Admin uniquement — liste paginée de toutes les évaluations
    // ─────────────────────────────────────────────────────────────────
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int agencyId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        // Construire la requête de base
        var query = _context.Ratings
            .Include(r => r.Ticket)
                .ThenInclude(t => t.Service)
            .Include(r => r.Ticket)
                .ThenInclude(t => t.Client)
            .Where(r => r.Ticket.Service.AgencyId == agencyId)
            .OrderByDescending(r => r.CreatedAt);

        // Compter le total pour la pagination
        var totalCount = await query.CountAsync();

        // Appliquer la pagination
        // Skip = on saute les pages précédentes
        // Take = on prend seulement pageSize éléments
        var ratings = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Calculer la note moyenne
        var averageScore = totalCount > 0
            ? await _context.Ratings
                .Include(r => r.Ticket)
                    .ThenInclude(t => t.Service)
                .Where(r => r.Ticket.Service.AgencyId == agencyId)
                .AverageAsync(r => r.Score)
            : 0;

        return Ok(new
        {
            // Données de la page courante
            items = ratings.Select(MapToResponseDto),
            // Métadonnées de pagination
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
            // Statistiques globales
            averageScore = Math.Round(averageScore, 1),
            // Distribution des notes (combien de 1*, 2*, etc.)
            distribution = await GetScoreDistributionAsync(agencyId),
        });
    }

    // ─────────────────────────────────────────────────────────────────
    // GET api/ratings/stats?agencyId=1
    // Admin — statistiques de satisfaction uniquement
    // ─────────────────────────────────────────────────────────────────
    [HttpGet("stats")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetStats([FromQuery] int agencyId)
    {
        var ratings = await _context.Ratings
            .Include(r => r.Ticket)
                .ThenInclude(t => t.Service)
            .Where(r => r.Ticket.Service.AgencyId == agencyId)
            .ToListAsync();

        if (!ratings.Any())
            return Ok(new
            {
                totalRatings = 0,
                averageScore = 0,
                distribution = new Dictionary<int, int>()
            });

        var averageScore = ratings.Average(r => r.Score);

        // Distribution : { 1: 3, 2: 5, 3: 12, 4: 25, 5: 18 }
        var distribution = ratings
            .GroupBy(r => r.Score)
            .OrderBy(g => g.Key)
            .ToDictionary(g => g.Key, g => g.Count());

        return Ok(new
        {
            totalRatings = ratings.Count,
            averageScore = Math.Round(averageScore, 1),
            distribution,
        });
    }

    // ─────────────────────────────────────────────────────────────────
    // Méthode privée — distribution des notes pour une agence
    // ─────────────────────────────────────────────────────────────────
    private async Task<Dictionary<int, int>> GetScoreDistributionAsync(int agencyId)
    {
        var distribution = await _context.Ratings
            .Include(r => r.Ticket)
                .ThenInclude(t => t.Service)
            .Where(r => r.Ticket.Service.AgencyId == agencyId)
            .GroupBy(r => r.Score)
            .Select(g => new { Score = g.Key, Count = g.Count() })
            .ToListAsync();

        // S'assurer que toutes les notes de 1 à 5 sont présentes
        // même si leur count est 0
        return Enumerable.Range(1, 5)
            .ToDictionary(
                score => score,
                score => distribution
                    .FirstOrDefault(d => d.Score == score)?.Count ?? 0
            );
    }

    // ─────────────────────────────────────────────────────────────────
    // Méthode de mapping — Rating → RatingResponseDto
    // ─────────────────────────────────────────────────────────────────
    private static RatingResponseDto MapToResponseDto(Rating rating)
    {
        return new RatingResponseDto
        {
            Id = rating.Id,
            TicketId = rating.TicketId,
            TicketNumber = rating.Ticket?.TicketNumber ?? string.Empty,
            ServiceName = rating.Ticket?.Service?.Name ?? string.Empty,
            ClientName = rating.Ticket?.Client != null
                ? $"{rating.Ticket.Client.FirstName} {rating.Ticket.Client.LastName}"
                : string.Empty,
            Score = rating.Score,
            Comment = rating.Comment,
            CreatedAt = rating.CreatedAt,
        };
    }
}