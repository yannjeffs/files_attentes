import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import {
  CheckCircle,
  Clock,
  Users,
  Hash,
  Landmark,
  ArrowLeft,
  Home,
  Phone,
  Bell,
  AlertCircle,
  Eye,
} from "lucide-react";
import { ticketService } from "../../services/ticketService";
import type { Ticket } from "../../@types";

export default function TicketConfirmation() {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const location = useLocation();

  const [ticket, setTicket] = useState<Ticket | null>(
    location.state?.ticket ?? null,
  );
  const [loading, setLoading] = useState(!location.state?.ticket);
  const [error, setError] = useState("");

  // État de l'appel — quand c'est le tour du client
  const [isCalled, setIsCalled] = useState(false);
  const [calledCounter, setCalledCounter] = useState<number | null>(null);
  const [signalRConnected, setSignalRConnected] = useState(false);

  // Charger le ticket si accès direct par URL
  useEffect(() => {
    if (!ticket && ticketId) {
      ticketService
        .getById(Number(ticketId))
        .then((t) => {
          setTicket(t);
          // Sauvegarder le ticket actif
          localStorage.setItem("qora_active_ticket", JSON.stringify(t));
        })
        .catch(() => setError("Ticket introuvable."))
        .finally(() => setLoading(false));
    } else if (ticket) {
      // Ticket passé via state — on le sauvegarde aussi
      localStorage.setItem("qora_active_ticket", JSON.stringify(ticket));
    }
  }, [ticketId, ticket]);

  // Connexion SignalR — écoute l'appel du ticket
  useEffect(() => {
    if (!ticket) return;

    let stopped = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5180/hubs/queue")
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on("TicketCalled", (calledTicket: Ticket) => {
      if (calledTicket.ticketNumber === ticket.ticketNumber) {
        setIsCalled(true);
        setCalledCounter(calledTicket.counterNumber ?? null);
        localStorage.removeItem("qora_active_ticket");

        if (Notification.permission === "granted") {
          new Notification("🔔 C'est votre tour !", {
            body: `Présentez-vous au guichet ${calledTicket.counterNumber}. Ticket : ${calledTicket.ticketNumber}`,
            icon: "/favicon.ico",
          });
        }
      }
    });

    const start = async () => {
      try {
        await connection.start();
        if (stopped) {
          await connection.stop();
          return;
        }
        setSignalRConnected(true);
        await connection.invoke("JoinGroup", `agency-1`);
      } catch (err) {
        if (!stopped) {
          console.warn("SignalR — connexion échouée :", err);
          setSignalRConnected(false);
        }
      }
    };

    start();

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      stopped = true;
      connection.stop();
    };
  }, [ticket?.ticketNumber, ticket]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{
              borderColor: "var(--color-primary)",
              borderTopColor: "transparent",
            }}
          />
          <p style={{ color: "var(--color-text-secondary)" }}>
            Chargement de votre ticket...
          </p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="text-center">
          <AlertCircle
            size={48}
            color="var(--color-danger)"
            className="mx-auto mb-4"
          />
          <p
            className="text-lg font-semibold mb-4"
            style={{ color: "var(--color-danger)" }}
          >
            {error || "Ticket introuvable."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-xl text-white text-sm font-medium"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Header */}
      <header
        className="w-full px-6 py-4 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: "var(--color-dark)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="22" r="12" stroke="white" strokeWidth="3" />
              <circle cx="26" cy="22" r="5" fill="white" />
              <circle cx="14" cy="38" r="3" fill="white" opacity="0.7" />
              <circle cx="26" cy="42" r="3" fill="white" opacity="0.9" />
              <circle cx="38" cy="38" r="3" fill="white" opacity="0.7" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-white text-sm">Qora</p>
            <p className="text-xs" style={{ color: "var(--color-primary)" }}>
              SCB Cameroun
            </p>
          </div>
        </div>

        {/* Indicateur connexion temps réel */}
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: signalRConnected
                ? "var(--color-success)"
                : "var(--color-danger)",
            }}
          />
          <span className="text-xs" style={{ color: "var(--color-primary)" }}>
            {signalRConnected ? "Connecté en temps réel" : "Reconnexion..."}
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        {/* ── ALERTE — C'EST LE TOUR DU CLIENT ── */}
        {isCalled && (
          <div
            className="rounded-2xl p-6 mb-8 text-center animate-pulse"
            style={{
              backgroundColor: "rgba(39, 174, 96, 0.1)",
              border: "2px solid var(--color-success)",
            }}
          >
            <div className="flex justify-center mb-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(39, 174, 96, 0.15)" }}
              >
                <Bell size={32} color="var(--color-success)" />
              </div>
            </div>
            <h2
              className="text-2xl font-bold mb-2"
              style={{ color: "var(--color-success)" }}
            >
              🎉 C'est votre tour !
            </h2>
            <p
              className="text-base font-medium mb-1"
              style={{ color: "var(--color-dark)" }}
            >
              Présentez-vous au{" "}
              <span
                className="font-bold"
                style={{ color: "var(--color-success)" }}
              >
                Guichet {calledCounter}
              </span>
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Ticket : <strong>{ticket.ticketNumber}</strong> — Une notification
              WhatsApp vous a également été envoyée.
            </p>
          </div>
        )}

        {/* Étapes */}
        {!isCalled && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {["Choisir un service", "Vos informations", "Votre ticket"].map(
              (step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center
                        justify-center text-xs font-bold"
                      style={{
                        backgroundColor: "var(--color-success)",
                        color: "white",
                      }}
                    >
                      ✓
                    </div>
                    <span
                      className="text-xs hidden sm:block"
                      style={{ color: "var(--color-success)", fontWeight: 600 }}
                    >
                      {step}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className="w-8 h-px mx-1"
                      style={{ backgroundColor: "var(--color-success)" }}
                    />
                  )}
                </div>
              ),
            )}
          </div>
        )}

        {/* Icône succès */}
        {!isCalled && (
          <div className="flex justify-center mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(39, 174, 96, 0.1)" }}
            >
              <CheckCircle size={44} color="var(--color-success)" />
            </div>
          </div>
        )}

        {/* Titre */}
        {!isCalled && (
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-bold mb-1"
              style={{ color: "var(--color-dark)" }}
            >
              Votre ticket est prêt !
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Présentez-vous en agence et attendez votre appel.
            </p>
          </div>
        )}

        {/* Carte ticket */}
        <div
          className="rounded-2xl overflow-hidden shadow-md mb-6"
          style={{
            border: `2px solid ${isCalled ? "var(--color-success)" : "var(--color-primary)"}`,
          }}
        >
          {/* En-tête carte */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ backgroundColor: "var(--color-dark)" }}
          >
            <div className="flex items-center gap-2">
              <Landmark size={18} color="white" />
              <span className="text-white text-sm font-semibold">
                SCB Cameroun
              </span>
            </div>
            {isCalled && (
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: "var(--color-success)",
                  color: "white",
                }}
              >
                🔔 Appelé
              </span>
            )}
          </div>

          {/* Numéro de ticket */}
          <div
            className="flex flex-col items-center justify-center py-10"
            style={{ backgroundColor: "var(--color-white)" }}
          >
            <p
              className="text-xs font-medium tracking-widest uppercase mb-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Numéro de ticket
            </p>
            <p
              className="text-6xl font-bold tracking-wider"
              style={{
                color: isCalled
                  ? "var(--color-success)"
                  : "var(--color-primary)",
              }}
            >
              {ticket.ticketNumber}
            </p>
            <p
              className="text-sm mt-3 font-medium"
              style={{ color: "var(--color-dark)" }}
            >
              {ticket.serviceName}
            </p>
            {isCalled && calledCounter && (
              <p
                className="text-base font-bold mt-2"
                style={{ color: "var(--color-success)" }}
              >
                → Guichet {calledCounter}
              </p>
            )}
          </div>

          {/* Métriques */}
          <div
            className="grid grid-cols-3 divide-x"
            style={{
              borderTop: "1px solid #E5E7EB",
              backgroundColor: "var(--color-neutral)",
            }}
          >
            <div className="flex flex-col items-center py-4 gap-1">
              <Clock size={18} style={{ color: "var(--color-primary)" }} />
              <p
                className="text-xs"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Attente estimée
              </p>
              <p
                className="text-sm font-bold"
                style={{ color: "var(--color-dark)" }}
              >
                {isCalled ? "0 min" : `${ticket.estimatedWaitTime ?? 0} min`}
              </p>
            </div>

            <div className="flex flex-col items-center py-4 gap-1">
              <Users size={18} style={{ color: "var(--color-primary)" }} />
              <p
                className="text-xs"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Service
              </p>
              <p
                className="text-sm font-bold"
                style={{ color: "var(--color-dark)" }}
              >
                {ticket.serviceCode}
              </p>
            </div>

            <div className="flex flex-col items-center py-4 gap-1">
              <Hash size={18} style={{ color: "var(--color-primary)" }} />
              <p
                className="text-xs"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Statut
              </p>
              <p
                className="text-sm font-bold"
                style={{
                  color: isCalled
                    ? "var(--color-success)"
                    : "var(--color-primary)",
                }}
              >
                {isCalled ? "Appelé" : "En attente"}
              </p>
            </div>
          </div>
        </div>

        {/* Notification WhatsApp */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
          style={{
            backgroundColor: "rgba(39, 174, 96, 0.08)",
            border: "1px solid rgba(39, 174, 96, 0.2)",
          }}
        >
          <Phone size={18} color="var(--color-success)" />
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-success)" }}
            >
              {isCalled
                ? "Notification WhatsApp envoyée — C'est votre tour !"
                : "Ticket envoyé sur WhatsApp"}
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {isCalled
                ? "Vous avez reçu un message WhatsApp vous invitant à vous présenter au guichet."
                : "Vous recevrez une notification WhatsApp dès que votre tour arrivera."}
            </p>
          </div>
        </div>

        {/* Instructions — uniquement si pas encore appelé */}
        {!isCalled && (
          <div
            className="rounded-xl px-5 py-4 mb-8"
            style={{
              backgroundColor: "var(--color-white)",
              border: "1px solid #E5E7EB",
            }}
          >
            <p
              className="text-sm font-semibold mb-3"
              style={{ color: "var(--color-dark)" }}
            >
              Instructions
            </p>
            {[
              "Rendez-vous en agence et attendez en salle d'attente.",
              "Surveillez cette page ou attendez votre notification WhatsApp.",
              "Présentez-vous au guichet indiqué dès que votre numéro est appelé.",
            ].map((instruction, i) => (
              <div key={i} className="flex items-start gap-3 mb-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center
                    text-xs font-bold shrink-0 mt-0.5"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "white",
                  }}
                >
                  {i + 1}
                </div>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {instruction}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl
              text-sm font-medium border transition-all hover:opacity-80"
            style={{
              borderColor: "#E5E7EB",
              color: "var(--color-text-secondary)",
              backgroundColor: "var(--color-white)",
            }}
          >
            <ArrowLeft size={16} />
            Retour
          </button>

          <button
            onClick={() => navigate("/")}
            className="flex-1 flex items-center justify-center gap-2
              py-3 rounded-xl text-white font-semibold text-sm transition-all"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Home size={16} />
            Nouveau ticket
          </button>
          <button
            onClick={() =>
              navigate(`/ticket/suivi/${ticketId}`, { state: { ticket } })
            }
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border-2"
            style={{
              borderColor: "var(--color-primary)",
              color: "var(--color-primary)",
              backgroundColor: "transparent",
            }}
          >
            <Eye size={16} />
            Suivre mon ticket
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6">
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          © 2026 Qora — SCB Cameroun. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
