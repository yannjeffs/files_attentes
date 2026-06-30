using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public enum NotificationStatus { Pending, Sent, Failed }

public class WhatsAppNotification
{
    [Key]
    public int Id { get; set; }
    public int TicketId { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationStatus Status { get; set; } = NotificationStatus.Pending;
    public DateTime? SentAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public WhatsAppNotification(int ticketId, string phone, string message)
    {
        TicketId = ticketId;
        Phone = phone;
        Message = message;
    }

    // Navigation
    public Ticket Ticket { get; set; } = null!;
}