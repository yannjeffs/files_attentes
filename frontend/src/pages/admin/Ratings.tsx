import { useState, useEffect, useCallback } from "react";
import {
  Star,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useAuthStore } from "../../store/authStore";
import { ratingService } from "../../services/ratingService";
import { serviceService } from "../../services/serviceService";
import type { RatingListResponse, Service } from "../../@types";

// ── Couleur associée à une note ─────────────────────────────────────────
const getScoreColor = (score: number) => {
  if (score <= 2) return "var(--color-danger)";
  if (score === 3) return "var(--color-warning)";
  return "#F59E0B";
};

// ── Étoiles en lecture seule ────────────────────────────────────────────
function StarRow({ score, size = 16 }: { score: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          style={{
            color: star <= score ? getScoreColor(score) : "#E5E7EB",
            fill: star <= score ? getScoreColor(score) : "none",
          }}
        />
      ))}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function Ratings() {
  const { user } = useAuthStore();

  const [response, setResponse] = useState<RatingListResponse | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtres
  const [serviceId, setServiceId] = useState<string>("");
  const [score, setScore] = useState<string>("");
  const [page, setPage] = useState(1);

  // ── Charger la liste des évaluations ────────────────────────────
  const loadRatings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await ratingService.getAll({
        agencyId: user.agencyId,
        page,
        pageSize: PAGE_SIZE,
        serviceId: serviceId ? Number(serviceId) : undefined,
        score: score ? Number(score) : undefined,
      });
      setResponse(data);
      setError("");
    } catch {
      setError("Impossible de charger les évaluations.");
    } finally {
      setLoading(false);
    }
  }, [user, page, serviceId, score]);

  // ── Charger la liste des services pour le filtre ────────────────
  useEffect(() => {
    if (!user) return;
    serviceService
      .getAll(user.agencyId)
      .then(setServices)
      .catch(() => {});
  }, [user]);

  // ── Recharger quand les filtres ou la page changent ─────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRatings();
  }, [loadRatings]);

  // ── Réinitialiser la page quand un filtre change ────────────────
  const handleServiceChange = (val: string) => {
    setServiceId(val === "all" ? "" : val);
    setPage(1);
  };

  const handleScoreChange = (val: string) => {
    setScore(val === "all" ? "" : val);
    setPage(1);
  };

  const resetFilters = () => {
    setServiceId("");
    setScore("");
    setPage(1);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Distribution — max pour calculer la largeur des barres
  const distribution = response?.distribution ?? {};
  const maxDistribution = Math.max(1, ...Object.values(distribution));
  const totalRatings = response?.totalRatings ?? 0;

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--color-dark)" }}
          >
            Évaluations
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Satisfaction des clients après leur passage en agence
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadRatings}
          className="flex items-center gap-2"
          style={{ borderColor: "#E5E7EB", color: "var(--color-text-secondary)" }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualiser
        </Button>
      </div>

      {/* Erreur */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: "#FEE2E2", color: "var(--color-danger)" }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── STATISTIQUES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Note moyenne */}
        <Card className="border shadow-sm">
          <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full">
            <p
              className="text-4xl font-bold"
              style={{ color: "var(--color-dark)" }}
            >
              {response ? response.averageScore.toFixed(1) : "—"}
              <span
                className="text-base font-normal ml-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                / 5
              </span>
            </p>
            <div className="mt-2">
              <StarRow score={Math.round(response?.averageScore ?? 0)} size={20} />
            </div>
            <p
              className="text-sm mt-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Note moyenne
              {serviceId &&
                services.find((s) => s.id === Number(serviceId)) && (
                  <>
                    {" "}pour{" "}
                    <span style={{ color: "var(--color-primary)" }}>
                      {services.find((s) => s.id === Number(serviceId))?.name}
                    </span>
                  </>
                )}
            </p>
          </CardContent>
        </Card>

        {/* Total évaluations */}
        <Card className="border shadow-sm">
          <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: "rgba(74,158,232,0.1)" }}
            >
              <TrendingUp size={22} style={{ color: "var(--color-primary)" }} />
            </div>
            <p
              className="text-3xl font-bold"
              style={{ color: "var(--color-primary)" }}
            >
              {totalRatings}
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Évaluation{totalRatings > 1 ? "s" : ""} reçue{totalRatings > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Distribution des notes */}
        <Card className="border shadow-sm lg:col-span-1">
          <CardContent className="p-5">
            <p
              className="text-xs font-semibold mb-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Répartition des notes
            </p>
            <div className="flex flex-col gap-1.5">
              {[5, 4, 3, 2, 1].map((s) => {
                const count = distribution[s] ?? 0;
                const pct = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0;
                return (
                  <button
                    key={s}
                    onClick={() => handleScoreChange(score === String(s) ? "all" : String(s))}
                    className="flex items-center gap-2 group"
                  >
                    <span
                      className="text-xs font-medium w-3 shrink-0"
                      style={{
                        color: score === String(s)
                          ? "var(--color-primary)"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      {s}
                    </span>
                    <Star
                      size={11}
                      style={{
                        color: score === String(s) ? "var(--color-primary)" : "#D1D5DB",
                        fill: score === String(s) ? "var(--color-primary)" : "#D1D5DB",
                      }}
                    />
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden transition-opacity group-hover:opacity-80"
                      style={{ backgroundColor: "#F3F4F6" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(count / maxDistribution) * 100}%`,
                          backgroundColor:
                            score === String(s) ? "var(--color-primary)" : "#D1D5DB",
                        }}
                      />
                    </div>
                    <span
                      className="text-xs w-9 text-right shrink-0"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {pct}%
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── FILTRES ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: "var(--color-dark)" }}
          >
            <Filter size={14} style={{ color: "var(--color-primary)" }} />
            Filtres
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={serviceId || "all"} onValueChange={handleServiceChange}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Tous les services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les services</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={score || "all"} onValueChange={handleScoreChange}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Toutes les notes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les notes</SelectItem>
                {[5, 4, 3, 2, 1].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} étoile{s > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(serviceId || score) && (
            <button
              onClick={resetFilters}
              className="mt-3 flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--color-danger)" }}
            >
              <X size={12} />
              Réinitialiser les filtres
            </button>
          )}
        </CardContent>
      </Card>

      {/* ── LISTE DES ÉVALUATIONS ── */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw
                size={28}
                className="animate-spin"
                style={{ color: "var(--color-primary)" }}
              />
            </div>
          ) : !response || response.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Star
                size={36}
                style={{ color: "var(--color-text-secondary)", opacity: 0.4 }}
              />
              <p style={{ color: "var(--color-text-secondary)" }}>
                Aucune évaluation trouvée pour ces critères.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col">
                {response.items.map((rating, index) => (
                  <div
                    key={rating.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4"
                    style={{
                      borderBottom:
                        index < response.items.length - 1
                          ? "1px solid #F3F4F6"
                          : "none",
                    }}
                  >
                    {/* Étoiles + note */}
                    <div className="flex items-center gap-2 shrink-0 sm:w-28">
                      <StarRow score={rating.score} />
                    </div>

                    {/* Ticket + service + commentaire */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          style={{
                            backgroundColor: "rgba(74,158,232,0.1)",
                            color: "var(--color-primary)",
                            border: "none",
                            fontSize: "11px",
                          }}
                        >
                          {rating.ticketNumber}
                        </Badge>
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--color-dark)" }}
                        >
                          {rating.serviceName}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          — {rating.clientName}
                        </span>
                      </div>
                      {rating.comment && (
                        <p
                          className="text-sm mt-1.5 flex items-start gap-1.5"
                          style={{ color: "var(--color-text)" }}
                        >
                          <MessageSquare
                            size={13}
                            className="mt-0.5 shrink-0"
                            style={{ color: "var(--color-text-secondary)" }}
                          />
                          <span className="italic">"{rating.comment}"</span>
                        </p>
                      )}
                    </div>

                    {/* Date */}
                    <p
                      className="text-xs shrink-0 sm:text-right"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      {formatDate(rating.createdAt)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div
                className="flex items-center justify-between px-4 py-3 border-t"
                style={{ borderColor: "#E5E7EB" }}
              >
                <p
                  className="text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {response.totalCount} résultat(s) — page {response.page} / {response.totalPages || 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8"
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setPage((p) => Math.min(response.totalPages || 1, p + 1))
                    }
                    disabled={page >= response.totalPages}
                    className="w-8 h-8"
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}