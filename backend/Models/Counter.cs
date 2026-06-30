using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Counter
{
    [Key]
    public int Id { get; set; }
    public int AgencyId { get; set; }
    public int Number { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Counter(int id, int agencyId, int number, string name, bool isActive, DateTime createdAt)
    {
        Id = id;
        AgencyId = agencyId;
        Number = number;
        Name = name;
        IsActive = isActive;
        CreatedAt = createdAt;
    }

    // Navigation
    public Agency Agency { get; set; } = null!;
    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<ServiceCounter> ServiceCounters { get; set; } = new List<ServiceCounter>();
}
