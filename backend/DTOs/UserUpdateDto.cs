public class UserUpdateDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = "Agent";

    // ← Nouveau : guichet assigné
    public int? CounterId { get; set; }
}

public class ToggleActiveDto
{
    public bool IsActive { get; set; }
}

// ← Nouveau : DTO pour assigner un agent à un guichet
public class AssignCounterDto
{
    public int? CounterId { get; set; }
}