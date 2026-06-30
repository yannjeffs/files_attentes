using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class AuditLog
{
    [Key]
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AuditLog(string action, string entityType, string entityId, string? oldValues = null, string? newValues = null, string? ipAddress = null)
    {
        Action = action;
        EntityType = entityType;
        EntityId = entityId;
        OldValues = oldValues;
        NewValues = newValues;
        IpAddress = ipAddress;
    }

    // Navigation
    public User? User { get; set; }
}