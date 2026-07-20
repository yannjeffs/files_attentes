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
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly JwtService _jwtService;

    public AuthController(AppDbContext context, JwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    // POST: api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Counter)
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);
        if (user == null)
            return Unauthorized(new { message = "Invalid email or password." });

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        var token = _jwtService.GenerateToken(user);

        // Résoudre le service géré par le guichet de l'agent (s'il en a un)
        int? serviceId = null;
        string? serviceName = null;
        if (user.CounterId.HasValue)
        {
            var serviceCounter = await _context.ServiceCounters
                .Include(sc => sc.Service)
                .FirstOrDefaultAsync(sc => sc.CounterId == user.CounterId.Value);
            if (serviceCounter != null)
            {
                serviceId = serviceCounter.ServiceId;
                serviceName = serviceCounter.Service.Name;
            }
        }

        return Ok(new AuthResponse
        {
            Token = token,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role.ToString(),
            AgencyId = user.AgencyId,
            CounterId = user.CounterId,
            ExpiresAt = DateTime.UtcNow.AddMinutes(60), // Le token expira dans 60 minutes.
        });
    }

    // POST: api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        // Vériffier si l'email existe déjà
        var exists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (exists)
            return BadRequest(new { message = "C'est email est déjà utilisé." });

        // Vérifier si l'agence existe
        var agency = await _context.Agencies.FindAsync(request.AgencyId);
        if (agency == null)
            return BadRequest(new { message = "Agence introuvable." });

        // Parser le rôle
        if (!Enum.TryParse<UserRole>(request.Role, out var role))
            return BadRequest(new { message = "Rôle invalide." });

        // Un guichet ne peut être assigné qu'à un Agent, pas à un Admin
        int? counterId = null;
        if (request.CounterId.HasValue)
        {
            if (role != UserRole.Agent)
                return BadRequest(new { message = "Seul un agent peut être assigné à un guichet." });

            var counter = await _context.Counters
                .FirstOrDefaultAsync(c => c.Id == request.CounterId.Value && c.AgencyId == request.AgencyId);
            if (counter == null)
                return BadRequest(new { message = "Guichet introuvable pour cette agence." });

            var alreadyTaken = await _context.Users
                .AnyAsync(u => u.CounterId == request.CounterId.Value && u.IsActive);
            if (alreadyTaken)
                return BadRequest(new { message = "Ce guichet est déjà assigné à un autre agent." });

            counterId = counter.Id;
        }

        // Créer l'utilisateur
        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Phone = request.Phone,
            Role = role,
            AgencyId = request.AgencyId,
            CounterId = request.CounterId,
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Utilisateur crée."});
    }
}