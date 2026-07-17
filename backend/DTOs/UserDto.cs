namespace backend.DTOs
{
    public class UserUpdateDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string Role { get; set; } = "Agent";
    }

    public class ToggleActiveDto
    {
        public bool IsActive { get; set; }
    }
}