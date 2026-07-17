using backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuditLogsController(AppDbContext context)
    {
        _context = context;
    }

    // GET api/auditlogs?agencyId=1&page=1&pageSize=20&action=&entityType=
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int agencyId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? action = null,
        [FromQuery] string? entityType = null,
        [FromQuery] string? dateFrom = null,
        [FromQuery] string? dateTo = null)
    {
        // Requête de base — logs des utilisateurs de cette agence
        var query = _context.AuditLogs
            .Include(l => l.User)
            .Where(l => l.User == null ||
                        l.User.AgencyId == agencyId)
            .AsQueryable();

        // Filtre par action
        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(l =>
                l.Action.Contains(action));

        // Filtre par type d'entité
        if (!string.IsNullOrWhiteSpace(entityType))
            query = query.Where(l =>
                l.EntityType == entityType);

        // Filtre par date de début
        if (DateTime.TryParse(dateFrom, out var from))
            query = query.Where(l => l.CreatedAt >= from);

        // Filtre par date de fin
        if (DateTime.TryParse(dateTo, out var to))
            query = query.Where(l =>
                l.CreatedAt <= to.AddDays(1));

        // Trier par date décroissante — le plus récent en premier
        query = query.OrderByDescending(l => l.CreatedAt);

        // Compter le total pour la pagination
        var totalCount = await query.CountAsync();

        // Appliquer la pagination
        var logs = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new
            {
                l.Id,
                l.Action,
                l.EntityType,
                l.EntityId,
                l.OldValues,
                l.NewValues,
                l.IpAddress,
                l.CreatedAt,
                UserName = l.User != null
                    ? $"{l.User.FirstName} {l.User.LastName}"
                    : "Système",
                UserRole = l.User != null
                    ? l.User.Role.ToString()
                    : null,
            })
            .ToListAsync();

        // Retourner les logs avec les métadonnées de pagination
        return Ok(new
        {
            items = logs,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(
                (double)totalCount / pageSize),
        });
    }

    // GET api/auditlogs/entity-types?agencyId=1
    // Retourne la liste des types d'entités distincts
    // Utilisé pour le filtre du frontend
    [HttpGet("entity-types")]
    public async Task<IActionResult> GetEntityTypes(
        [FromQuery] int agencyId)
    {
        var types = await _context.AuditLogs
            .Include(l => l.User)
            .Where(l => l.User == null ||
                        l.User.AgencyId == agencyId)
            .Select(l => l.EntityType)
            .Distinct()
            .OrderBy(t => t)
            .ToListAsync();

        return Ok(types);
    }
}