// Controllers/UsersController.cs
using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;

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
            .Where(u => u.AgencyId == agencyId)
            .Select(u => new
            {
                u.Id, u.FirstName, u.LastName,
                u.Email, u.Phone, u.Role,
                u.IsActive, u.AgencyId, u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    // PUT api/users/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id,
        [FromBody] UserUpdateDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "Utilisateur introuvable." });

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Phone = dto.Phone;

        if (Enum.TryParse<UserRole>(dto.Role, out var role))
            user.Role = role;

        await _context.SaveChangesAsync();
        return Ok(new
        {
            user.Id, user.FirstName, user.LastName,
            user.Email, user.Phone,
            Role = user.Role.ToString(),
            user.IsActive, user.AgencyId, user.CreatedAt
        });
    }

    // PUT api/users/{id}/toggle-active
    [HttpPut("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id,
        [FromBody] ToggleActiveDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "Utilisateur introuvable." });

        user.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            user.Id, user.FirstName, user.LastName,
            user.Email, user.Phone,
            Role = user.Role.ToString(),
            user.IsActive, user.AgencyId, user.CreatedAt
        });
    }
}