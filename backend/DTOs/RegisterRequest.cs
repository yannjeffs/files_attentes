namespace backend.DTOs;

public class RegisterRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = "Agent";
    public int AgencyId { get; set; }

    // ← Nouveau : guichet assigné dès la création
    public int? CounterId { get; set; }
}