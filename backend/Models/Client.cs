using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Client
{
    [Key]
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string? AccountNumber { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Client(int id, string firstName, string lastName, string? email, string phone, string? accountNumber, DateTime createdAt)
    {
        Id = id;
        FirstName = firstName;
        LastName = lastName;
        Email = email;
        Phone = phone;
        AccountNumber = accountNumber;
        CreatedAt = createdAt;
    }

    // Navigation
    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
}