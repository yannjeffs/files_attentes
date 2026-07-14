namespace backend.DTOs;

public class TicketCreateDto
{
    public int ServiceId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? AccountNumber { get; set; }
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

public class TicketPositionDto
{
    // Position actuelle dans la file (ex: 3)
    public int Position { get; set; }

    // Nombre de personnes avant le client
    public int PeopleAhead { get; set; }

    // Temps d'attente recalculé en minutes
    public int EstimatedWaitTime { get; set; }

    // Statut actuel du ticket
    public string Status { get; set; } = string.Empty;

    // Numéro de guichet si ticket déjà appelé
    public int? CounterNumber { get; set; }
}

public class TicketUpdateClientDto
{
    // Nouveau numéro de téléphone WhatsApp
    public string Phone { get; set; } = string.Empty;

    // Nouvel email (optionnel)
    public string? Email { get; set; }
}

// Données envoyées par le client pour noter son passage
public class RatingCreateDto
{
    // Note de 1 à 5 étoiles — obligatoire
    public int Score { get; set; }

    // Commentaire optionnel
    public string? Comment { get; set; }
}

// Données retournées après création ou consultation d'une notation
public class RatingResponseDto
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public int Score { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}
