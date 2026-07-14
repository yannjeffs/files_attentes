import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Monitor,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { useAuthStore } from "../../store/authStore";
import { statsService, type TicketByDay } from "../../services/statsService";
import type { DashboardStats } from "../../@types";

// ── Composant carte KPI ───────────────────────────────────────────────────────
// Ce composant est réutilisable — il affiche une métrique avec
// une icône, une valeur, un label et une couleur
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  bg: string;
  suffix?: string;
  trend?: string;
}

function KpiCard({
  icon,
  label,
  value,
  color,
  bg,
  suffix,
  trend,
}: KpiCardProps) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          {/* Icône */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: bg }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
          {/* Trend optionnel */}
          {trend && (
            <Badge
              className="text-xs"
              style={{
                backgroundColor: "rgba(39,174,96,0.1)",
                color: "var(--color-success)",
                border: "none",
              }}
            >
              {trend}
            </Badge>
          )}
        </div>
        {/* Valeur */}
        <p className="text-3xl font-bold mt-3" style={{ color }}>
          {value}
          {suffix && (
            <span className="text-base font-normal ml-1">{suffix}</span>
          )}
        </p>
        {/* Label */}
        <p
          className="text-sm mt-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Composant métrique secondaire ─────────────────────────────────────────────
// Plus compact que KpiCard — utilisé pour les métriques moins importantes
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(74,158,232,0.08)" }}
        >
          <span style={{ color: "var(--color-primary)" }}>{icon}</span>
        </div>
        <div>
          <p
            className="text-xl font-bold"
            style={{ color: "var(--color-dark)" }}
          >
            {value}
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuthStore();

  // Stats du jour
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Données du graphique
  const [chartData, setChartData] = useState<TicketByDay[]>([]);

  // Nombre de jours sélectionné pour le graphique (7 ou 30)
  const [chartDays, setChartDays] = useState<7 | 30>(7);

  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState("");

  // Chargement initial — useEffect séparé sans dépendance sur les fonctions
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const [statsData, chartData] = await Promise.all([
          statsService.getDashboard(user.agencyId),
          statsService.getTicketsByDay(user.agencyId, 7),
        ]);
        if (cancelled) return;
        setStats(statsData);
        setChartData(chartData);
      } catch {
        if (!cancelled) setError("Impossible de charger les statistiques.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // loadStats — uniquement pour le bouton "Actualiser"
  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await statsService.getDashboard(user.agencyId);
      setStats(data);
    } catch {
      setError("Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // loadChart — uniquement pour le sélecteur 7j / 30j
  const loadChart = useCallback(
    async (days: 7 | 30) => {
      if (!user) return;
      setChartLoading(true);
      try {
        const data = await statsService.getTicketsByDay(user.agencyId, days);
        setChartData(data);
      } catch {
        console.error("Erreur chargement graphique");
      } finally {
        setChartLoading(false);
      }
    },
    [user],
  );

  // Quand on change la période du graphique
  const handleChartDays = (days: 7 | 30) => {
    setChartDays(days);
    loadChart(days);
  };

  // ── Formater les minutes en hh:mm ────────────────────────────────────────
  // Ex: 8.5 minutes → "08:30"
  const formatMinutes = (minutes: number): string => {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ── Heure actuelle ────────────────────────────────────────────────────────
  const currentTime = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const currentDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── État de chargement ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw
            size={32}
            className="animate-spin"
            style={{ color: "var(--color-primary)" }}
          />
          <p style={{ color: "var(--color-text-secondary)" }}>
            Chargement des statistiques...
          </p>
        </div>
      </div>
    );
  }

  // ── État d'erreur ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle
            size={40}
            className="mx-auto mb-3"
            style={{ color: "var(--color-danger)" }}
          />
          <p style={{ color: "var(--color-danger)" }}>{error}</p>
          <Button
            onClick={loadStats}
            className="mt-4"
            style={{ backgroundColor: "var(--color-primary)", color: "white" }}
          >
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── EN-TÊTE ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--color-dark)" }}
          >
            Tableau de bord
          </h1>
          {/* Date et heure formatées */}
          <p
            className="text-sm mt-0.5 capitalize"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {currentDate} — {currentTime}
          </p>
        </div>

        {/* Bouton rafraîchir */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            loadStats();
            loadChart(chartDays);
          }}
          className="flex items-center gap-2"
          style={{
            borderColor: "#E5E7EB",
            color: "var(--color-text-secondary)",
          }}
        >
          <RefreshCw size={14} />
          Actualiser
        </Button>
      </div>

      {/* ── KPI PRINCIPAUX ── */}
      {/* 4 cartes sur 2 colonnes (mobile) ou 4 colonnes (desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users size={22} />}
          label="En attente"
          value={stats?.waitingCount ?? 0}
          color="var(--color-primary)"
          bg="rgba(74,158,232,0.1)"
          trend={stats && stats.waitingCount > 10 ? "↑ Affluence" : undefined}
        />
        <KpiCard
          icon={<TrendingUp size={22} />}
          label="En service"
          value={stats?.inServiceCount ?? 0}
          color="#9B51E0"
          bg="rgba(155,81,224,0.1)"
        />
        <KpiCard
          icon={<CheckCircle size={22} />}
          label="Servis aujourd'hui"
          value={stats?.servedCount ?? 0}
          color="var(--color-success)"
          bg="rgba(39,174,96,0.1)"
        />
        <KpiCard
          icon={<XCircle size={22} />}
          label="Absents (No Show)"
          value={stats?.noShowCount ?? 0}
          color="var(--color-danger)"
          bg="rgba(235,87,87,0.1)"
        />
      </div>

      {/* ── MÉTRIQUES SECONDAIRES ── */}
      {/* 3 cartes compactes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={<Monitor size={20} />}
          label="Guichets actifs"
          value={String(stats?.totalCounters ?? 0)}
        />
        <MetricCard
          icon={<Clock size={20} />}
          label="Attente moyenne"
          value={formatMinutes(stats?.averageWaitTime ?? 0)}
        />
        <MetricCard
          icon={<TrendingUp size={20} />}
          label="Traitement moyen"
          value={formatMinutes(stats?.averageServiceTime ?? 0)}
        />
      </div>

      {/* ── GRAPHIQUE ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle
              className="text-base font-semibold"
              style={{ color: "var(--color-dark)" }}
            >
              Statistiques des tickets
            </CardTitle>

            {/* Sélecteur de période */}
            <div className="flex gap-2">
              {([7, 30] as const).map((days) => (
                <Button
                  key={days}
                  size="sm"
                  onClick={() => handleChartDays(days)}
                  style={{
                    backgroundColor:
                      chartDays === days
                        ? "var(--color-primary)"
                        : "transparent",
                    color:
                      chartDays === days
                        ? "white"
                        : "var(--color-text-secondary)",
                    border: `1px solid ${
                      chartDays === days ? "var(--color-primary)" : "#E5E7EB"
                    }`,
                  }}
                >
                  {days} jours
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-4">
          {/* Légende custom */}
          <div className="flex items-center gap-6 mb-4">
            {[
              { color: "var(--color-primary)", label: "Total" },
              { color: "var(--color-success)", label: "Servis" },
              { color: "var(--color-danger)", label: "Absents" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Graphique Recharts */}
          {chartLoading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw
                size={24}
                className="animate-spin"
                style={{ color: "var(--color-primary)" }}
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={chartData}
                // Marges pour éviter que les axes soient coupés
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                {/* Grille de fond */}
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#F0F0F0"
                  vertical={false}
                />

                {/* Axe X — les dates */}
                <XAxis
                  dataKey="date"
                  tick={{
                    fontSize: 11,
                    fill: "var(--color-text-secondary)",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                {/* Axe Y — les valeurs */}
                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "var(--color-text-secondary)",
                  }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />

                {/* Tooltip au survol */}
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E5E7EB",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  labelStyle={{ color: "var(--color-dark)", fontWeight: 600 }}
                />

                {/* Courbe Total */}
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "var(--color-primary)",
                    strokeWidth: 0,
                  }}
                  activeDot={{ r: 6 }}
                />

                {/* Courbe Servis */}
                <Line
                  type="monotone"
                  dataKey="served"
                  name="Servis"
                  stroke="var(--color-success)"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "var(--color-success)",
                    strokeWidth: 0,
                  }}
                  activeDot={{ r: 6 }}
                />

                {/* Courbe Absents */}
                <Line
                  type="monotone"
                  dataKey="noShow"
                  name="Absents"
                  stroke="var(--color-danger)"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "var(--color-danger)",
                    strokeWidth: 0,
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── RÉSUMÉ DU JOUR ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle
            className="text-base font-semibold"
            style={{ color: "var(--color-dark)" }}
          >
            Résumé du jour
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              {
                label: "Total tickets",
                value:
                  (stats?.waitingCount ?? 0) +
                  (stats?.inServiceCount ?? 0) +
                  (stats?.servedCount ?? 0) +
                  (stats?.noShowCount ?? 0),
                color: "var(--color-dark)",
              },
              {
                label: "Taux de service",
                value: (() => {
                  const total =
                    (stats?.servedCount ?? 0) + (stats?.noShowCount ?? 0);
                  if (total === 0) return "—";
                  return `${Math.round(
                    ((stats?.servedCount ?? 0) / total) * 100,
                  )} %`;
                })(),
                color: "var(--color-success)",
              },
              {
                label: "Taux d'absence",
                value: (() => {
                  const total =
                    (stats?.servedCount ?? 0) + (stats?.noShowCount ?? 0);
                  if (total === 0) return "—";
                  return `${Math.round(
                    ((stats?.noShowCount ?? 0) / total) * 100,
                  )} %`;
                })(),
                color: "var(--color-danger)",
              },
              {
                label: "Guichets ouverts",
                value: stats?.totalCounters ?? 0,
                color: "var(--color-primary)",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="py-3 rounded-xl"
                style={{ backgroundColor: "var(--color-bg)" }}
              >
                <p className="text-2xl font-bold" style={{ color: item.color }}>
                  {item.value}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
