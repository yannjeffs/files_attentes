using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CountersController : ControllerBase
{
    private readonly AppDbContext _context;

    public CountersController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/counters?agencyId=1
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int agencyId)
    {
        var counters = await _context.Counters
            .Where(c => c.AgencyId == agencyId)
            .Select(c => new CounterResponseDto
            {
                Id = c.Id,
                Number = c.Number,
                Name = c.Name,
                IsActive = c.IsActive,
                AgencyId = c.AgencyId,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(counters);
    }

    // GET: api/counters/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var counter = await _context.Counters.FindAsync(id);

        if (counter == null)
            return NotFound(new { message = "Guichet introuvable." });

        return Ok(new CounterResponseDto
        {
            Id = counter.Id,
            Number = counter.Number,
            Name = counter.Name,
            IsActive = counter.IsActive,
            AgencyId = counter.AgencyId,
            CreatedAt = counter.CreatedAt
        });
    }

    // POST: api/counters
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CounterCreateDto dto)
    {
        // Vérifier si l'agence existe
        var agency = await _context.Agencies.FindAsync(dto.AgencyId);
        if (agency == null)
            return NotFound(new { message = "Agence introuvable." });

        // Vérifier si le numéro existe déjà pour cette agence
        var numberExists = await _context.Counters.AnyAsync(c => c.Number == dto.Number && c.AgencyId == dto.AgencyId);
        if (numberExists)
            return BadRequest(new { message = "Le numéro de guichet existe déjà pour cette agence." });

        var counter = new Counter
        {
            Number = dto.Number,
            Name = dto.Name,
            AgencyId = dto.AgencyId,
            IsActive = true, // Par défaut, le guichet est actif
            CreatedAt = DateTime.UtcNow
        };

        _context.Counters.Add(counter);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = counter.Id }, new CounterResponseDto
        {
            Id = counter.Id,
            Number = counter.Number,
            Name = counter.Name,
            IsActive = counter.IsActive,
            AgencyId = counter.AgencyId,
            CreatedAt = counter.CreatedAt
        });
    }

    // PUT: api/counters/5
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] CounterUpdateDto dto)
    {
        // Vérifier si le guichet existe
        var counter = await _context.Counters.FindAsync(id);
        if (counter == null)
            return NotFound(new { message = "Guichet introuvable." });

        // Effectuer la mise à jour
        counter.Number = dto.Number;
        counter.Name = dto.Name;
        counter.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return Ok(new CounterResponseDto
        {
            Id = counter.Id,
            Number = counter.Number,
            Name = counter.Name,
            IsActive = counter.IsActive,
            AgencyId = counter.AgencyId,
            CreatedAt = counter.CreatedAt
        });
    }

    // DELETE: api/counters/5
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        // Vérifier si le guichet existe
        var counter = await _context.Counters.FindAsync(id);
        if (counter == null)
            return NotFound(new { message = "Ce guichet n'existe pas." });

        counter.IsActive = false; // Désactiver le guichet au lieu de le supprimer physiquement
        await _context.SaveChangesAsync();

        return Ok(new { message = "Guichet désactivé." });
    }
}
