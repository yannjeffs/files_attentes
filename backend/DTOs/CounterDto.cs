namespace backend.DTOs;

public class CounterCreateDto
{
    public int Number { get; set; }
    public string Name { get; set; } = string.Empty;
    public int AgencyId { get; set; }
}

public class CounterUpdateDto
{
    public int Number { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class CounterResponseDto
{
    public int Id { get; set; }
    public int Number { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int AgencyId { get; set; }
    public DateTime CreatedAt { get; set; }
}
