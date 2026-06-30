using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Agency
{
    [Key]
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Agency(int id, string name, string address, string phone, bool isActive, DateTime createdAt)
    {
        Id = id;
        Name = name;
        Address = address;
        Phone = phone;
        IsActive = isActive;
        CreatedAt = createdAt;
    }

    //Navigation
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Counter> Counters { get; set; } = new List<Counter>();
    public ICollection<Service> Services { get; set; } = new List<Service>();
}