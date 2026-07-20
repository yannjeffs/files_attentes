namespace backend.Models;

public enum UserRole { Admin, Agent }

public class User
{
    public int Id { get; set; }
    public int AgencyId { get; set; }

    // ← Nouveau : guichet assigné à l'agent (nullable)
    // Un agent peut ne pas encore avoir de guichet assigné
    public int? CounterId { get; set; }

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Agency Agency { get; set; } = null!;
    public Counter? Counter { get; set; } // ← Nouveau
    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}