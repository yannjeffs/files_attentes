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

    public Rating(int id, int ticketId, int score, string? comment, DateTime createdAt)
    {
        Id = id;
        TicketId = ticketId;
        Score = score;
        Comment = comment;
        CreatedAt = createdAt;
    }

    // Navigation
    public Ticket Ticket { get; set; } = null!;
}