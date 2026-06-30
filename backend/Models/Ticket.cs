using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public enum TicketStatus
{
    Waiting,
    Called,
    InProgress,
    Done,
    NoShow,
    Cancelled,
    Transferred
}

public enum TicketSource { Web, Kiosk }
public enum TicketPriority { Normal, VIP }

public class Ticket
{
    [Key]
    public int Id { get; set; }
    public int ServiceId { get; set; }
    public int ClientId { get; set; }
    public int? CounterId { get; set; }
    public int? AgentId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public TicketSource Source { get; set; } = TicketSource.Web;
    public TicketStatus Status { get; set; } = TicketStatus.Waiting;
    public TicketPriority Priority { get; set; } = TicketPriority.Normal;
    public int? EstimatedWaitTime { get; set; }
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CalledAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }

    // Navigation
    public Service Service { get; set; } = null!;
    public Client Client { get; set; } = null!;
    public Counter? Counter { get; set; }
    public User? Agent { get; set; }
    public Rating? Rating { get; set; }
    public ICollection<WhatsAppNotification> Notifications { get; set; } = new List<WhatsAppNotification>();
}