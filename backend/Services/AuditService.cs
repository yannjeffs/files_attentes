using backend.Data;
using backend.Models;
using System.Text.Json;

namespace backend.Services;

public class AuditService
{
    private readonly AppDbContext _context;

    public AuditService(AppDbContext context)
    {
        _context = context;
    }

    // Enregistre une action dans les logs d'audit
    public async Task LogAsync(
        string action,
        string entityType,
        string entityId,
        int? userId = null,
        object? oldValues = null,
        object? newValues = null,
        string? ipAddress = null)
    {
        var log = new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValues = oldValues != null
                ? JsonSerializer.Serialize(oldValues)
                : null,
            NewValues = newValues != null
                ? JsonSerializer.Serialize(newValues)
                : null,
            IpAddress = ipAddress,
            CreatedAt = DateTime.UtcNow,
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }
}