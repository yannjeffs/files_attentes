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

    // Navigation
    public Agency Agency { get; set; } = null!;
    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<ServiceCounter> ServiceCounters { get; set; } = new List<ServiceCounter>();
}
