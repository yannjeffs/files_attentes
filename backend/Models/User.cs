using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public enum UserRole { Admin, Agent }

public class User
{
    [Key]
    public int Id { get; set; }
    public int AgencyId { get; set; }
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
    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
