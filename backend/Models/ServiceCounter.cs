using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class ServiceCounter
{
    [Key]
    public int Id { get; set; }
    public int ServiceId { get; set; }
    public int CounterId { get; set; }

    public ServiceCounter(int id, int serviceId, int counterId)
    {
        Id = id;
        ServiceId = serviceId;
        CounterId = counterId;
    }

    // Navigation
    public Service Service { get; set; } = null!;
    public Counter Counter { get; set; } = null!;
}
