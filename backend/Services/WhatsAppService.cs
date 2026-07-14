using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace backend.Services;

public class WhatsAppService
{
    private readonly AppDbContext _context;
    private readonly ILogger<WhatsAppService> _logger;
    private readonly string _accountSid;
    private readonly string _authToken;
    private readonly string _whatsAppFrom;

    public WhatsAppService(AppDbContext context, ILogger<WhatsAppService> logger, IConfiguration config)
    {
        _context = context;
        _logger = logger;
        _accountSid = config["Twilio:AccountSid"]!;
        _authToken = config["Twilio:AuthToken"]!;
        _whatsAppFrom = config["Twilio:WhatsAppFrom"]!;
    }

    // Notification à la création du ticket
    public async Task SendTicketConfirmationAsync(Ticket ticket)
    {
        var service = await _context.Services.FindAsync(ticket.ServiceId);
        var client = await _context.Clients.FindAsync(ticket.ClientId);

        if (client == null || service == null) return;

        var position = await _context.Tickets
            .Where(t => t.ServiceId == ticket.ServiceId
                     && t.Status == TicketStatus.Waiting
                     && t.IssuedAt <= ticket.IssuedAt)
            .CountAsync();

        var message =
            $"✅ *Bonjour {client.FirstName} !*\n\n" +
            $"Votre ticket a bien été enregistré.\n\n" +
            $"🎫 *Ticket :* {ticket.TicketNumber}\n" +
            $"🏦 *Service :* {service.Name}\n" +
            $"👥 *Position :* {position} personne(s) avant vous\n" +
            $"⏱ *Attente estimée :* {ticket.EstimatedWaitTime} min\n\n" +
            $"Restez attentif, vous serez notifié dès que ce sera votre tour.\n\n" +
            $"_SCB Cameroun — Qora Queue Management_";

        await SaveAndSendAsync(ticket.Id, client.Phone, message);
    }

    // Notification de progression — envoyée aux seuils 5, 3, 1
    public async Task SendPositionUpdateAsync(
        Ticket ticket,
        int peopleAhead)
    {
        var client = await _context.Clients.FindAsync(ticket.ClientId);
        if (client == null) return;

        // On construit le message selon la position
        string message;

        if (peopleAhead == 0)
        {
            // Ne devrait pas arriver ici (géré par SendTicketCalledAsync)
            // mais on le traite par sécurité
            message =
                $"🔔 *C'est votre tour, {client.FirstName} !*\n\n" +
                $"🎫 *Ticket :* {ticket.TicketNumber}\n\n" +
                $"Présentez-vous immédiatement au guichet.\n\n" +
                $"_SCB Cameroun — Qora Queue Management_";
        }
        else if (peopleAhead == 1)
        {
            // Le client est le prochain — alerte importante
            message =
                $"⚡ *Vous êtes le suivant, {client.FirstName} !*\n\n" +
                $"🎫 *Ticket :* {ticket.TicketNumber}\n" +
                $"👥 *Personnes avant vous :* 1\n\n" +
                $"Préparez-vous, vous allez être appelé très prochainement.\n\n" +
                $"_SCB Cameroun — Qora Queue Management_";
        }
        else if (peopleAhead == 3)
        {
            message =
                $"⏳ *Encore 3 personnes avant vous, {client.FirstName}*\n\n" +
                $"🎫 *Ticket :* {ticket.TicketNumber}\n" +
                $"👥 *Personnes avant vous :* {peopleAhead}\n" +
                $"⏱ *Attente estimée :* ~{peopleAhead * 5} min\n\n" +
                $"Restez attentif, vous serez appelé bientôt.\n\n" +
                $"_SCB Cameroun — Qora Queue Management_";
        }
        else if (peopleAhead == 5)
        {
            message =
                $"📊 *Mise à jour de votre file, {client.FirstName}*\n\n" +
                $"🎫 *Ticket :* {ticket.TicketNumber}\n" +
                $"👥 *Personnes avant vous :* {peopleAhead}\n" +
                $"⏱ *Attente estimée :* ~{peopleAhead * 5} min\n\n" +
                $"Vous pouvez commencer à vous diriger vers l'agence.\n\n" +
                $"_SCB Cameroun — Qora Queue Management_";
        }
        else
        {
            // Ne devrait pas arriver — seuil non prévu
            return;
        }

        await SaveAndSendAsync(ticket.Id, client.Phone, message);
    }

    // Notification quand le ticket est appelé
    public async Task SendTicketCalledAsync(Ticket ticket)
    {
        var client = await _context.Clients.FindAsync(ticket.ClientId);
        var counter = ticket.CounterId.HasValue
            ? await _context.Counters.FindAsync(ticket.CounterId.Value)
            : null;

        if (client == null) return;

        var counterInfo = counter != null
            ? $"Guichet {counter.Number} — {counter.Name}"
            : "un guichet disponible";

        var message =
            $"🔔 *C'est votre tour, {client.FirstName} !*\n\n" +
            $"🎫 *Ticket :* {ticket.TicketNumber}\n" +
            $"📍 *Rendez-vous au :* {counterInfo}\n\n" +
            $"Présentez-vous immédiatement au guichet indiqué.\n\n" +
            $"_SCB Cameroun — Qora Queue Management_";

        await SaveAndSendAsync(ticket.Id, client.Phone, message);
    }

    // Méthode commune — sauvegarde + envoi Twilio
    private async Task SaveAndSendAsync(int ticketId, string phone, string message)
    {
        var notification = new WhatsAppNotification
        {
            TicketId = ticketId,
            Phone = phone,
            Message = message,
            Status = NotificationStatus.Pending,
        };

        _context.WhatsAppNotifications.Add(notification);
        await _context.SaveChangesAsync();

        try
        {
            TwilioClient.Init(_accountSid, _authToken);

            await MessageResource.CreateAsync(
                body: message,
                from: new PhoneNumber(_whatsAppFrom),        // fixe — sandbox Twilio
                to: new PhoneNumber($"whatsapp:{phone}")     // dynamique — numéro du client
            );

            notification.Status = NotificationStatus.Sent;
            notification.SentAt = DateTime.UtcNow;

            _logger.LogInformation(
                "WhatsApp envoyé à {Phone} — Ticket {TicketId}",
                phone, ticketId);
        }
        catch (Exception ex)
        {
            notification.Status = NotificationStatus.Failed;
            _logger.LogError(ex,
                "Échec envoi WhatsApp à {Phone} — Ticket {TicketId}",
                phone, ticketId);
        }

        await _context.SaveChangesAsync();
    }

    // Notification envoyée après que le ticket est terminé (Done)
    // Invite le client à noter son expérience
    public async Task SendRatingRequestAsync(Ticket ticket)
    {
        var client = await _context.Clients.FindAsync(ticket.ClientId);
        if (client == null) return;

        // URL de la page de notation — à adapter selon le domaine
        var ratingUrl = $"http://localhost:5173/ticket/rating/{ticket.Id}";

        var message =
            $"✅ *Merci pour votre visite, {client.FirstName} !*\n\n" +
            $"Votre demande a été traitée avec succès.\n\n" +
            $"🎫 *Ticket :* {ticket.TicketNumber}\n" +
            $"🏦 *Service :* {(await _context.Services.FindAsync(ticket.ServiceId))?.Name}\n\n" +
            $"⭐ *Notez votre expérience :*\n" +
            $"{ratingUrl}\n\n" +
            $"Votre avis nous aide à améliorer nos services.\n\n" +
            $"_SCB Cameroun — Qora Queue Management_";

        await SaveAndSendAsync(ticket.Id, client.Phone, message);
    }
}