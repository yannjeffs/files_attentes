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
public class ServicesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ServicesController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/services?agencyId=1
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int agencyId)
    {
        var services = await _context.Services
            .Where(s => s.AgencyId == agencyId)
            .Select(s => new ServiceResponseDto()
            {
                Id = s.Id,
                Name = s.Name,
                Code = s.Code,
                Description = s.Description,
                IsActive = s.IsActive,
                AgencyId = s.AgencyId,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();
        return Ok(services);
    }

    // GET: api/services/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null)
            return NotFound(new { message = "Le service est introuvable." });

        return Ok(new ServiceResponseDto
        {
            Id = service.Id,
            Name = service.Name,
            Code = service.Code,
            Description = service.Description,
            IsActive = service.IsActive,
            AgencyId = service.AgencyId,
            CreatedAt = service.CreatedAt
        });
    }

    // POST: api/services
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] ServiceCreateDto dto)
    {
        // Vérifier si l'agence existe
        var agency = await _context.Agencies.FindAsync(dto.AgencyId);
        if (agency == null)
            return BadRequest(new { message = "Agence introuvable." });

        // Vérifier si le code est déjà utilisé dans cette agence
        var codeExists = await _context.Services.AnyAsync(s => s.Code == dto.Code && s.AgencyId == dto.AgencyId);
        if (codeExists)
            return BadRequest(new { message = "Ce code est déjà utilisé pour cette agence." });

        var service = new Service
        {
            Name = dto.Name,
            Code = dto.Code.ToUpper(),
            Description = dto.Description,
            AgencyId = dto.AgencyId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Services.Add(service);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = service.Id }, new ServiceResponseDto
        {
            Id = service.Id,
            Name = service.Name,
            Code = service.Code,
            Description = service.Description,
            AgencyId = service.AgencyId,
            IsActive = service.IsActive,
            CreatedAt = service.CreatedAt
        });
    }

    // PUT: api/services/{id}
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] ServiceUpdateDto dto)
    {
        // Vérifier si le service existe
        var service = await _context.Services.FindAsync(id);
        if (service == null)
            return NotFound(new { message = "Ce service est introuvable." });

        service.Name = dto.Name;
        service.Code = dto.Code.ToUpper();
        service.Description = dto.Description;
        service.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        return Ok(new ServiceResponseDto
        {
            Id = service.Id,
            Name = service.Name,
            Code = service.Code,
            Description = service.Description,
            IsActive = service.IsActive,
            AgencyId = service.AgencyId,
            CreatedAt = service.CreatedAt
        });
    }

    // DELETE: api/services/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var service = await _context.Services.FindAsync(id);
        if (service == null)
            return NotFound(new { message = "Ce service est introuvable." });

        service.IsActive = false; // Désactiver le service au lieu de le supprimer physiquement
        await _context.SaveChangesAsync();

        return Ok(new { message = "Le service a été désactivé." });
    }
}