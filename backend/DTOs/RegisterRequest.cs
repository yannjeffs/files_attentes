namespace backend.DTOs;

public class RegisterRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; }= "Agent"; // Default role is "Agent"
    public int AgencyId { get; set; } // Foreign key to the Agency
}
