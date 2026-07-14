import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Star,
  CheckCircle,
  Landmark,
  Home,
  MessageSquare,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { ticketService } from "../../services/ticketService";
import { ratingService } from "../../services/ratingService";
import type { Ticket } from "../../@types";

export default function TicketRating() {
  const navigate = useNavigate();
  const { ticketId } = useParams();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // États du formulaire de notation
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedScore, setSelectedScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  // Labels des étoiles
  const starLabels = [
    "",
    "Très insatisfait",
    "Insatisfait",
    "Neutre",
    "Satisfait",
    "Très satisfait",
  ];

  // Couleur des étoiles selon la note
  const getStarColor = (score: number) => {
    if (score <= 2) return "var(--color-danger)";
    if (score === 3) return "var(--color-warning)";
    return "#F59E0B";
  };

  // ── Chargement initial ─────────────────────────────────────────
  useEffect(() => {
    if (!ticketId) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        // Charger le ticket
        const t = await ticketService.getById(Number(ticketId));
        if (cancelled) return;
        setTicket(t);

        // Vérifier si déjà noté
        const existing = await ratingService.getByTicket(Number(ticketId));
        if (cancelled) return;
        if (existing) {
          setAlreadyRated(true);
          setSelectedScore(existing.score);
          setComment(existing.comment ?? "");
        }

        // Vérifier que le ticket est bien terminé
        if (t.status !== "Done") {
          setError(
            "Ce ticket ne peut pas encore être noté. " +
              "Votre service doit être terminé.",
          );
        }
      } catch {
        if (!cancelled)
          setError("Impossible de charger les informations du ticket.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  // ── Soumettre la notation ──────────────────────────────────────
  const handleSubmit = async () => {
    if (selectedScore === 0) return;
    setSubmitting(true);
    try {
      await ratingService.create(Number(ticketId), {
        score: selectedScore,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(message || "Erreur de connexion.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── États de chargement / erreur ───────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: "var(--color-primary)" }}
          />
          <p style={{ color: "var(--color-text-secondary)" }}>Chargement...</p>
        </div>
      </div>
    );
  }

  // ── État : déjà noté ───────────────────────────────────────────
  if (alreadyRated) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <Card className="w-full max-w-md shadow-sm border text-center">
            <CardContent className="pt-8 pb-8 px-6">
              <div
                className="w-16 h-16 rounded-full flex items-center
                  justify-center mx-auto mb-4"
                style={{ backgroundColor: "rgba(74,158,232,0.1)" }}
              >
                <CheckCircle size={36} color="var(--color-primary)" />
              </div>
              <h2
                className="text-xl font-bold mb-2"
                style={{ color: "var(--color-dark)" }}
              >
                Vous avez déjà noté ce passage
              </h2>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Merci pour votre retour ! Votre évaluation a bien été
                enregistrée.
              </p>

              {/* Afficher la note déjà donnée */}
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={28}
                    style={{
                      color:
                        star <= selectedScore
                          ? getStarColor(selectedScore)
                          : "#E5E7EB",
                      fill:
                        star <= selectedScore
                          ? getStarColor(selectedScore)
                          : "none",
                    }}
                  />
                ))}
              </div>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {starLabels[selectedScore]}
              </p>

              <Button
                onClick={() => navigate("/")}
                className="w-full"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                }}
              >
                <Home size={16} className="mr-2" />
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ── État : notation soumise avec succès ────────────────────────
  if (submitted) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <Card className="w-full max-w-md shadow-sm border text-center">
            <CardContent className="pt-8 pb-8 px-6">
              <div
                className="w-20 h-20 rounded-full flex items-center
                  justify-center mx-auto mb-6"
                style={{ backgroundColor: "rgba(39,174,96,0.1)" }}
              >
                <CheckCircle size={44} color="var(--color-success)" />
              </div>
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: "var(--color-dark)" }}
              >
                Merci pour votre avis !
              </h2>
              <p
                className="text-sm mb-4"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Votre évaluation a bien été enregistrée. Elle nous aide à
                améliorer la qualité de nos services.
              </p>

              {/* Étoiles soumises */}
              <div className="flex justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={32}
                    style={{
                      color:
                        star <= selectedScore
                          ? getStarColor(selectedScore)
                          : "#E5E7EB",
                      fill:
                        star <= selectedScore
                          ? getStarColor(selectedScore)
                          : "none",
                    }}
                  />
                ))}
              </div>
              <p
                className="text-sm mb-6 font-medium"
                style={{ color: getStarColor(selectedScore) }}
              >
                {starLabels[selectedScore]}
              </p>

              <Button
                onClick={() => navigate("/")}
                className="w-full"
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                }}
              >
                <Home size={16} className="mr-2" />
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ── Formulaire de notation ─────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md flex flex-col gap-5">
          {/* Infos du ticket */}
          {ticket && (
            <Card className="shadow-sm border overflow-hidden">
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ backgroundColor: "var(--color-dark)" }}
              >
                <Landmark size={16} color="white" />
                <span className="text-white text-sm font-semibold">
                  SCB Cameroun
                </span>
                <span
                  className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--color-success)",
                    color: "white",
                  }}
                >
                  ✅ Terminé
                </span>
              </div>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {ticket.ticketNumber}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {ticket.serviceName}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--color-dark)" }}
                    >
                      {ticket.clientName}
                    </p>
                    {ticket.endedAt && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        Traité à{" "}
                        {new Date(ticket.endedAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulaire de notation */}
          <Card className="shadow-sm border">
            <CardContent className="pt-6 pb-6 px-6">
              <h2
                className="text-lg font-bold text-center mb-1"
                style={{ color: "var(--color-dark)" }}
              >
                Évaluez votre expérience
              </h2>
              <p
                className="text-sm text-center mb-6"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Comment s'est passé votre passage à l'agence ?
              </p>

              {/* Étoiles interactives */}
              <div className="flex justify-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= (hoveredStar || selectedScore);
                  const color = getStarColor(hoveredStar || selectedScore);
                  return (
                    <button
                      key={star}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setSelectedScore(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        size={40}
                        style={{
                          color: active ? color : "#D1D5DB",
                          fill: active ? color : "none",
                          transition: "all 0.15s ease",
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Label de la note */}
              <p
                className="text-center text-sm font-medium mb-6 h-5"
                style={{
                  color:
                    hoveredStar || selectedScore
                      ? getStarColor(hoveredStar || selectedScore)
                      : "var(--color-text-secondary)",
                }}
              >
                {hoveredStar
                  ? starLabels[hoveredStar]
                  : selectedScore
                    ? starLabels[selectedScore]
                    : "Sélectionnez une note"}
              </p>

              {/* Commentaire */}
              <div className="flex flex-col gap-1.5 mb-5">
                <label
                  className="text-sm font-medium flex items-center gap-2"
                  style={{ color: "var(--color-text)" }}
                >
                  <MessageSquare
                    size={14}
                    style={{ color: "var(--color-primary)" }}
                  />
                  Commentaire
                  <span
                    className="text-xs font-normal"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    (optionnel)
                  </span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez votre expérience..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border text-sm
                    outline-none resize-none transition-all"
                  style={{
                    borderColor: "#E5E7EB",
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-text)",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--color-primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
                <p
                  className="text-xs text-right"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {comment.length}/500
                </p>
              </div>

              {/* Erreur */}
              {error && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl
                    text-sm mb-4"
                  style={{
                    backgroundColor: "#FEE2E2",
                    color: "var(--color-danger)",
                  }}
                >
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Bouton soumettre */}
              <Button
                onClick={handleSubmit}
                disabled={selectedScore === 0 || submitting}
                className="w-full"
                style={{
                  backgroundColor:
                    selectedScore === 0 ? "#E5E7EB" : "var(--color-primary)",
                  color:
                    selectedScore === 0
                      ? "var(--color-text-secondary)"
                      : "white",
                  cursor: selectedScore === 0 ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Envoi en cours...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Star size={16} />
                    Soumettre mon évaluation
                  </span>
                )}
              </Button>

              {/* Passer */}
              <button
                onClick={() => navigate("/")}
                className="w-full mt-3 text-sm py-2 transition-opacity
                  hover:opacity-70"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Passer — ne pas évaluer
              </button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

// ── Composant Header réutilisable ──────────────────────────────────
function Header() {
  return (
    <header
      className="w-full px-6 py-4 flex items-center gap-3 shadow-sm"
      style={{ backgroundColor: "var(--color-dark)" }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <svg width="32" height="32" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="52" height="52" rx="14" fill="#378ADD"/>
            <circle cx="26" cy="24" r="10" stroke="white" stroke-width="2.5" fill="none"/>
            <circle cx="26" cy="24" r="4" fill="white"/>
            <line x1="33" y1="31" x2="40" y2="38" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="14" cy="38" r="2.5" fill="white" opacity="0.5"/>
            <circle cx="20" cy="38" r="2.5" fill="white" opacity="0.7"/>
            <circle cx="26" cy="38" r="2.5" fill="white"/>
        </svg>
      </div>
      <div>
        <p className="font-bold text-white text-sm">Qora</p>
        <p className="text-xs" style={{ color: "var(--color-primary)" }}>
          Évaluation du service
        </p>
      </div>
    </header>
  );
}
