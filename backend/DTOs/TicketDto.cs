namespace backend.DTOs;

public class TicketCreateDto
{
    public int ServiceId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? AccountNumber { get; set; }
    public string Priority { get; set; } = "Normal"; // Default priority
}

public class TicketTransferDto
{
    public int NewServiceId { get; set; }
}

public class TicketResponseDto
{
    public int Id { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceCode { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string ClientPhone { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public int? EstimatedWaitTime { get; set; }
    public int? CounterNumber { get; set; }
    public string? AgentName { get; set; }
    public DateTime IssuedAt { get; set; }
    public DateTime? CalledAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
}
