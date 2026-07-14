using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Rating
{
    [Key]
    public int Id { get; set; }
    public int TicketId { get; set; }
    public int Score { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Ticket Ticket { get; set; } = null!;
}