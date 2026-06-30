using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Service
{
    [Key]
    public int Id { get; set; }
    public int AgencyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Service(int id, int agencyId, string name, string code, string? description, bool isActive, DateTime createdAt)
    {
        Id = id;
        AgencyId = agencyId;
        Name = name;
        Code = code;
        Description = description;
        IsActive = isActive;
        CreatedAt = createdAt;
    }

    // Navigation
    public Agency Agency { get; set; } = null!;
    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<ServiceCounter> ServiceCounters { get; set; } = new List<ServiceCounter>();
}
