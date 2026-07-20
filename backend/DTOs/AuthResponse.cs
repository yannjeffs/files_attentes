public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int AgencyId { get; set; }
    public int? CounterId { get; set; } // ← Nouveau
    public DateTime ExpiresAt { get; set; }
}