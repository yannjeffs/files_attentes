import { useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  Users,
  Monitor,
  ClipboardList,
  Star,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { useAuthStore } from "../../store/authStore";

// ── Éléments de navigation ────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: "Tableau de bord",
    icon: <LayoutDashboard size={20} />,
    path: "/admin",
  },
  {
    label: "Services",
    icon: <Settings size={20} />,
    path: "/admin/services",
  },
  {
    label: "Guichets",
    icon: <Monitor size={20} />,
    path: "/admin/counters",
  },
  {
    label: "Agents",
    icon: <Users size={20} />,
    path: "/admin/agents",
  },
  {
    label: "Audit Logs",
    icon: <ClipboardList size={20} />,
    path: "/admin/logs",
  },
  {
    label: "Évaluations",
    icon: <Star size={20} />,
    path: "/admin/ratings",
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Sidebar ouverte/fermée sur mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (firstName = "", lastName = "") =>
    `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  // Vérifie si un lien est actif
  // Pour le tableau de bord, on vérifie l'égalité exacte
  // Pour les autres, on vérifie si le path commence par la route
  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <TooltipProvider>
      <div
        className="min-h-screen flex"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        {/* ── OVERLAY MOBILE ── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── SIDEBAR ── */}
        <aside
          className={`
          fixed top-0 left-0 h-screen z-30 flex flex-col
          transition-transform duration-300 w-64
          lg:sticky lg:top-0 lg:translate-x-0 lg:h-screen
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
          style={{ backgroundColor: "var(--color-dark)" }}
        >
          {/* Logo */}
          <div className="px-5 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <svg width="20" height="20" viewBox="0 0 52 52" fill="none">
                  <circle
                    cx="26"
                    cy="22"
                    r="12"
                    stroke="white"
                    strokeWidth="3"
                  />
                  <circle cx="26" cy="22" r="5" fill="white" />
                  <circle cx="14" cy="38" r="3" fill="white" opacity="0.7" />
                  <circle cx="26" cy="42" r="3" fill="white" opacity="0.9" />
                  <circle cx="38" cy="38" r="3" fill="white" opacity="0.7" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-white text-sm">Qora</p>
                <p
                  className="text-xs"
                  style={{ color: "var(--color-primary)" }}
                >
                  Administration
                </p>
              </div>
            </div>
            {/* Bouton fermer sur mobile */}
            <button
              className="lg:hidden text-white/60 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <Separator style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5
                  rounded-xl text-sm font-medium transition-all text-left"
                style={{
                  backgroundColor: isActive(item.path)
                    ? "rgba(74,158,232,0.15)"
                    : "transparent",
                  color: isActive(item.path)
                    ? "var(--color-primary)"
                    : "rgba(255,255,255,0.6)",
                  borderLeft: isActive(item.path)
                    ? "3px solid var(--color-primary)"
                    : "3px solid transparent",
                }}
              >
                <span
                  style={{
                    color: isActive(item.path)
                      ? "var(--color-primary)"
                      : "rgba(255,255,255,0.5)",
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
                {isActive(item.path) && (
                  <ChevronRight
                    size={14}
                    className="ml-auto"
                    style={{ color: "var(--color-primary)" }}
                  />
                )}
              </button>
            ))}
          </nav>

          <Separator style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />

          {/* Profil agent en bas */}
          <div className="px-4 py-4 flex items-center gap-3">
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarFallback
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  fontSize: "12px",
                }}
              >
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p
                className="text-xs truncate"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Administrateur
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="shrink-0 w-8 h-8 text-white/40
                    hover:text-white hover:bg-white/10"
                >
                  <LogOut size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Déconnexion</TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* ── CONTENU PRINCIPAL ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header
            className="w-full px-6 py-3 flex items-center gap-4
              border-b shrink-0 shadow-sm"
            style={{
              backgroundColor: "var(--color-white)",
              borderColor: "#E5E7EB",
            }}
          >
            {/* Bouton menu mobile */}
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              style={{ color: "var(--color-dark)" }}
            >
              <Menu size={22} />
            </button>

            {/* Titre de la page courante */}
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-dark)" }}
            >
              {NAV_ITEMS.find((item) => isActive(item.path))?.label ??
                "Administration"}
            </p>

            {/* Séparateur + agence */}
            <div className="ml-auto flex items-center gap-3">
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5
                  rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "rgba(74,158,232,0.08)",
                  color: "var(--color-primary)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--color-success)" }}
                />
                SCB Cameroun — Agence centrale
              </div>
            </div>
          </header>

          {/* Zone de contenu — Outlet rend la page enfant */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
