using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    // GET api/users?agencyId=1
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int agencyId)
    {
        var users = await _context.Users
            .Include(u => u.Counter)
                .ThenInclude(c => c != null ? c.ServiceCounters : null)
            .Where(u => u.AgencyId == agencyId)
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.Phone,
                Role = u.Role.ToString(),
                u.IsActive,
                u.AgencyId,
                u.CounterId,
                u.CreatedAt,
                // Infos du guichet assigné
                CounterName = u.Counter != null
                    ? u.Counter.Name
                    : null,
                CounterNumber = u.Counter != null
                    ? (int?)u.Counter.Number
                    : null,
                // Service lié au guichet
                ServiceId = u.Counter != null
                    ? u.Counter.ServiceCounters
                        .Select(sc => sc.ServiceId)
                        .FirstOrDefault()
                    : (int?)null,
            })
            .ToListAsync();

        return Ok(users);
    }

    // PUT api/users/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UserUpdateDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Counter)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            return NotFound(new { message = "Utilisateur introuvable." });

        // Vérifier que le guichet existe si fourni
        if (dto.CounterId.HasValue)
        {
            var counter = await _context.Counters
                .FindAsync(dto.CounterId.Value);
            if (counter == null)
                return BadRequest(new { message = "Guichet introuvable." });
        }

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Phone = dto.Phone;
        user.CounterId = dto.CounterId;

        if (Enum.TryParse<UserRole>(dto.Role, out var role))
            user.Role = role;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Phone,
            Role = user.Role.ToString(),
            user.IsActive,
            user.AgencyId,
            user.CounterId,
            user.CreatedAt,
        });
    }

    // PUT api/users/{id}/toggle-active
    [HttpPut("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(
        int id,
        [FromBody] ToggleActiveDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "Utilisateur introuvable." });

        user.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Phone,
            Role = user.Role.ToString(),
            user.IsActive,
            user.AgencyId,
            user.CounterId,
            user.CreatedAt,
        });
    }

    // PUT api/users/{id}/assign-counter
    // Assigner ou désassigner un guichet à un agent
    [HttpPut("{id}/assign-counter")]
    public async Task<IActionResult> AssignCounter(
        int id,
        [FromBody] AssignCounterDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "Utilisateur introuvable." });

        if (dto.CounterId.HasValue)
        {
            // Vérifier que le guichet existe et est actif
            var counter = await _context.Counters
                .FindAsync(dto.CounterId.Value);

            if (counter == null || !counter.IsActive)
                return BadRequest(new
                {
                    message = "Guichet introuvable ou inactif."
                });

            // Vérifier qu'aucun autre agent actif n'est
            // déjà assigné à ce guichet
            var alreadyAssigned = await _context.Users
                .AnyAsync(u =>
                    u.CounterId == dto.CounterId &&
                    u.IsActive &&
                    u.Id != id);

            if (alreadyAssigned)
                return BadRequest(new
                {
                    message = "Ce guichet est déjà assigné à un autre agent actif."
                });
        }

        user.CounterId = dto.CounterId;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = dto.CounterId.HasValue
                ? "Agent assigné au guichet avec succès."
                : "Agent désassigné du guichet.",
            user.Id,
            user.CounterId,
        });
    }
}