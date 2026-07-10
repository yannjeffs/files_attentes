import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import {
  LogOut,
  Bell,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  UserX,
  ChevronRight,
  Clock,
  Users,
  Ticket,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Separator } from "../../components/ui/separator";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { useAuthStore } from "../../store/authStore";
import { ticketService } from "../../services/ticketService";
import { serviceService } from "../../services/serviceService";
import type { Ticket as TicketType, Service } from "../../@types";

// ── Couleur selon statut ──────────────────────────────────────────────────────
const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  Waiting: {
    label: "En attente",
    color: "#4A9EE8",
    bg: "rgba(74,158,232,0.1)",
  },
  Called: { label: "Appelé", color: "#F2994A", bg: "rgba(242,153,74,0.1)" },
  InProgress: {
    label: "En cours",
    color: "#9B51E0",
    bg: "rgba(155,81,224,0.1)",
  },
  Done: { label: "Terminé", color: "#27AE60", bg: "rgba(39,174,96,0.1)" },
  NoShow: { label: "Absent", color: "#EB5757", bg: "rgba(235,87,87,0.1)" },
  Cancelled: { label: "Annulé", color: "#6B7280", bg: "rgba(107,114,128,0.1)" },
  Transferred: {
    label: "Transféré",
    color: "#6B7280",
    bg: "rgba(107,114,128,0.1)",
  },
};

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [queue, setQueue] = useState<TicketType[]>([]);
  const [activeTicket, setActiveTicket] = useState<TicketType | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Transfer modal
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTicketId, setTransferTicketId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [transferLoading, setTransferLoading] = useState(false);

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // ── Charger la file d'attente ──────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
  if (!user) return;
  try {
    const servicesData = await serviceService.getAll(user.agencyId);
    setServices(servicesData.filter((s) => s.isActive));

    const allTickets: TicketType[] = [];
    for (const service of servicesData.filter((s) => s.isActive)) {
      const tickets = await ticketService.getQueue(service.id);
      allTickets.push(...tickets);
    }

    const myActive = allTickets.find(
      (t) =>
        (t.status === 'InProgress' || t.status === 'Called') &&
        t.agentName === `${user.firstName} ${user.lastName}`
    );

    const waiting = allTickets.filter((t) => t.status === 'Waiting');

    setActiveTicket(myActive ?? null);
    setQueue(waiting);
  } catch (err) {
    console.error('Erreur chargement file :', err);
  } finally {
    setLoading(false);
  }
}, [user]);

  // ── SignalR ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (connectionRef.current) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5180/hubs/queue", {
        accessTokenFactory: () => localStorage.getItem("qora_token") || "",
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    connection.on("TicketCreated", (ticket: TicketType) => {
      setQueue((prev) => {
        const exists = prev.find((t) => t.id === ticket.id);
        if (exists) return prev;
        return [...prev, ticket].sort((a, b) => {
          if (a.priority === "VIP" && b.priority !== "VIP") return -1;
          if (a.priority !== "VIP" && b.priority === "VIP") return 1;
          const dateA = a.issuedAt ? new Date(a.issuedAt).getTime() : 0;
          const dateB = b.issuedAt ? new Date(b.issuedAt).getTime() : 0;
          return dateA - dateB;
        });
      });
    });

    connection.on("TicketCalled", (ticket: TicketType) => {
      setQueue((prev) => prev.filter((t) => t.id !== ticket.id));
      if (ticket.agentName === `${user.firstName} ${user.lastName}`) {
        setActiveTicket(ticket);
      }
    });

    connection.on("TicketStarted", (ticket: TicketType) => {
      if (ticket.agentName === `${user.firstName} ${user.lastName}`) {
        setActiveTicket(ticket);
      }
    });

    connection.on("TicketCompleted", (ticket: TicketType) => {
      if (activeTicket?.id === ticket.id) setActiveTicket(null);
    });

    connection.on("TicketNoShow", (ticket: TicketType) => {
      if (activeTicket?.id === ticket.id) setActiveTicket(null);
    });

    connection.on("TicketTransferred", (ticket: TicketType) => {
      if (activeTicket?.id === ticket.id) setActiveTicket(null);
    });

    connection
      .start()
      .then(async () => {
        setConnected(true);
        await connection.invoke("JoinGroup", `agency-${user.agencyId}`);
      })
      .catch(() => setConnected(false));

    connection.onreconnected(() => setConnected(true));
    connection.onreconnecting(() => setConnected(false));

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  }, [user?.agencyId, activeTicket?.id, user]);

  useEffect(() => {
  let cancelled = false;

  const fetchQueue = async () => {
    if (!user) return;
    try {
      const servicesData = await serviceService.getAll(user.agencyId);
      if (cancelled) return;
      setServices(servicesData.filter((s) => s.isActive));

      const allTickets: TicketType[] = [];
      for (const service of servicesData.filter((s) => s.isActive)) {
        const tickets = await ticketService.getQueue(service.id);
        if (cancelled) return;
        allTickets.push(...tickets);
      }

      const myActive = allTickets.find(
        (t) =>
          (t.status === 'InProgress' || t.status === 'Called') &&
          t.agentName === `${user.firstName} ${user.lastName}`
      );

      const waiting = allTickets.filter((t) => t.status === 'Waiting');

      if (!cancelled) {
        setActiveTicket(myActive ?? null);
        setQueue(waiting);
        setLoading(false);
      }
    } catch (err) {
      if (!cancelled) {
        console.error('Erreur chargement file :', err);
        setLoading(false);
      }
    }
  };

  fetchQueue();

  return () => {
    cancelled = true;
  };
}, [user?.agencyId, user?.firstName, user?.lastName, user]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCallNext = async () => {
    const next = queue[0];
    if (!next) return;
    setActionLoading("call");
    try {
      const updated = await ticketService.call(next.id);
      setActiveTicket(updated);
      setQueue((prev) => prev.filter((t) => t.id !== next.id));
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStart = async () => {
    if (!activeTicket) return;
    setActionLoading("start");
    try {
      const updated = await ticketService.start(activeTicket.id);
      setActiveTicket(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    if (!activeTicket) return;
    setActionLoading("complete");
    try {
      await ticketService.complete(activeTicket.id);
      setActiveTicket(null);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleNoShow = async () => {
    if (!activeTicket) return;
    setActionLoading("noshow");
    try {
      await ticketService.noShow(activeTicket.id);
      setActiveTicket(null);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferOpen = (ticketId: number) => {
    setTransferTicketId(ticketId);
    setSelectedServiceId("");
    setTransferOpen(true);
  };

  const handleTransfer = async () => {
    if (!transferTicketId || !selectedServiceId) return;
    setTransferLoading(true);
    try {
      await ticketService.transfer(transferTicketId, Number(selectedServiceId));
      setActiveTicket(null);
      setTransferOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setTransferLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatTime = (dateStr: string | undefined) => {
    if (!dateStr) return "--:--";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="flex flex-col items-center gap-4">
          <RefreshCw
            size={32}
            className="animate-spin"
            style={{ color: "var(--color-primary)" }}
          />
          <p style={{ color: "var(--color-text-secondary)" }}>
            Chargement du dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        {/* ── HEADER ── */}
        <header
          className="w-full px-6 py-3 flex items-center justify-between shadow-sm shrink-0"
          style={{ backgroundColor: "var(--color-dark)" }}
        >
          {/* Logo + titre */}
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
                Dashboard Agent
              </p>
            </div>
          </div>

          {/* Centre — statut connexion */}
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: connected
                  ? "var(--color-success)"
                  : "var(--color-danger)",
              }}
            />
            <span className="text-xs text-white/60">
              {connected ? "Temps réel actif" : "Reconnexion..."}
            </span>
          </div>

          {/* Droite — agent + déconnexion */}
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                  fontSize: "12px",
                }}
              >
                {user
                  ? getInitials(`${user.firstName} ${user.lastName}`)
                  : "AG"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-white text-xs font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs" style={{ color: "var(--color-primary)" }}>
                {user?.role}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  <LogOut size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Déconnexion</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* ── CONTENU PRINCIPAL ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* ── ZONE PRINCIPALE ── */}
          <main className="flex-1 p-6 overflow-y-auto">
            {/* KPI rapides */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                {
                  icon: (
                    <Users
                      size={20}
                      style={{ color: "var(--color-primary)" }}
                    />
                  ),
                  label: "En attente",
                  value: queue.length,
                  color: "var(--color-primary)",
                },
                {
                  icon: (
                    <Bell size={20} style={{ color: "var(--color-warning)" }} />
                  ),
                  label: "VIP en attente",
                  value: queue.filter((t) => t.priority === "VIP").length,
                  color: "var(--color-warning)",
                },
                {
                  icon: (
                    <Ticket
                      size={20}
                      style={{ color: "var(--color-success)" }}
                    />
                  ),
                  label: "En traitement",
                  value: activeTicket ? 1 : 0,
                  color: "var(--color-success)",
                },
              ].map((kpi, i) => (
                <Card key={i} className="border shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: `${kpi.color}15`,
                      }}
                    >
                      {kpi.icon}
                    </div>
                    <div>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: kpi.color }}
                      >
                        {kpi.value}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {kpi.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Ticket en cours */}
            <Card className="mb-6 border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle
                  className="text-base font-semibold flex items-center gap-2"
                  style={{ color: "var(--color-dark)" }}
                >
                  <Ticket size={18} style={{ color: "var(--color-primary)" }} />
                  Ticket en cours
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {activeTicket ? (
                  <div className="flex flex-col gap-4">
                    {/* Infos ticket */}
                    <div
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{
                        backgroundColor:
                          statusConfig[activeTicket.status]?.bg ??
                          "rgba(74,158,232,0.1)",
                        border: `1px solid ${statusConfig[activeTicket.status]?.color ?? "#4A9EE8"}30`,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p
                            className="text-3xl font-bold tracking-wide"
                            style={{
                              color:
                                statusConfig[activeTicket.status]?.color ??
                                "var(--color-primary)",
                            }}
                          >
                            {activeTicket.ticketNumber}
                          </p>
                          <p
                            className="text-sm mt-0.5"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {activeTicket.serviceName}
                          </p>
                        </div>
                        <Separator orientation="vertical" className="h-10" />
                        <div>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: "var(--color-dark)" }}
                          >
                            {activeTicket.clientName}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {activeTicket.clientPhone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeTicket.priority === "VIP" && (
                          <Badge
                            style={{
                              backgroundColor: "var(--color-warning)",
                              color: "white",
                            }}
                          >
                            ⭐ VIP
                          </Badge>
                        )}
                        <Badge
                          style={{
                            backgroundColor:
                              statusConfig[activeTicket.status]?.bg,
                            color: statusConfig[activeTicket.status]?.color,
                            border: `1px solid ${statusConfig[activeTicket.status]?.color}30`,
                          }}
                        >
                          {statusConfig[activeTicket.status]?.label}
                        </Badge>
                        <div
                          className="flex items-center gap-1 text-xs"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <Clock size={12} />
                          {formatTime(activeTicket.issuedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Actions selon statut */}
                    <div className="flex flex-wrap gap-2">
                      {activeTicket.status === "Called" && (
                        <Button
                          onClick={handleStart}
                          disabled={actionLoading === "start"}
                          style={{
                            backgroundColor: "var(--color-primary)",
                            color: "white",
                          }}
                        >
                          <ChevronRight size={16} className="mr-1" />
                          {actionLoading === "start"
                            ? "Démarrage..."
                            : "Démarrer le traitement"}
                        </Button>
                      )}

                      {activeTicket.status === "InProgress" && (
                        <Button
                          onClick={handleComplete}
                          disabled={actionLoading === "complete"}
                          style={{
                            backgroundColor: "var(--color-success)",
                            color: "white",
                          }}
                        >
                          <CheckCircle size={16} className="mr-1" />
                          {actionLoading === "complete"
                            ? "Finalisation..."
                            : "Terminer le traitement"}
                        </Button>
                      )}

                      {(activeTicket.status === "Called" ||
                        activeTicket.status === "InProgress") && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleTransferOpen(activeTicket.id)}
                            style={{
                              borderColor: "var(--color-primary)",
                              color: "var(--color-primary)",
                            }}
                          >
                            <ArrowRightLeft size={16} className="mr-1" />
                            Transférer
                          </Button>

                          {activeTicket.status === "Called" && (
                            <Button
                              variant="outline"
                              onClick={handleNoShow}
                              disabled={actionLoading === "noshow"}
                              style={{
                                borderColor: "var(--color-danger)",
                                color: "var(--color-danger)",
                              }}
                            >
                              <UserX size={16} className="mr-1" />
                              {actionLoading === "noshow"
                                ? "Traitement..."
                                : "Absent (No Show)"}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <XCircle
                      size={40}
                      style={{ color: "var(--color-text-secondary)" }}
                    />
                    <p
                      className="text-sm"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Aucun ticket en cours — appelez le suivant
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>

          {/* ── PANNEAU DROIT — FILE D'ATTENTE ── */}
          <aside
            className="w-80 shrink-0 border-l flex flex-col"
            style={{
              backgroundColor: "var(--color-white)",
              borderColor: "#E5E7EB",
            }}
          >
            {/* En-tête file */}
            <div
              className="px-4 py-3 flex items-center justify-between border-b"
              style={{ borderColor: "#E5E7EB" }}
            >
              <div className="flex items-center gap-2">
                <Users size={16} style={{ color: "var(--color-primary)" }} />
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-dark)" }}
                >
                  File d'attente
                </span>
                <Badge
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "white",
                    fontSize: "11px",
                  }}
                >
                  {queue.length}
                </Badge>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={loadQueue}
                    className="w-7 h-7"
                  >
                    <RefreshCw
                      size={14}
                      style={{ color: "var(--color-text-secondary)" }}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rafraîchir</TooltipContent>
              </Tooltip>
            </div>

            {/* Bouton appeler suivant */}
            <div className="p-4 border-b" style={{ borderColor: "#E5E7EB" }}>
              <Button
                className="w-full"
                onClick={handleCallNext}
                disabled={
                  queue.length === 0 ||
                  actionLoading === "call" ||
                  !!activeTicket
                }
                style={{
                  backgroundColor:
                    queue.length === 0 || !!activeTicket
                      ? "#E5E7EB"
                      : "var(--color-primary)",
                  color:
                    queue.length === 0 || !!activeTicket
                      ? "var(--color-text-secondary)"
                      : "white",
                }}
              >
                <Bell size={16} className="mr-2" />
                {actionLoading === "call"
                  ? "Appel en cours..."
                  : activeTicket
                    ? "Terminez le ticket en cours"
                    : queue.length === 0
                      ? "File vide"
                      : `Appeler le suivant — ${queue[0]?.ticketNumber}`}
              </Button>
            </div>

            {/* Liste tickets */}
            <ScrollArea className="flex-1">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Users
                    size={36}
                    style={{
                      color: "var(--color-text-secondary)",
                      opacity: 0.4,
                    }}
                  />
                  <p
                    className="text-xs text-center"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Aucun ticket en attente
                  </p>
                </div>
              ) : (
                <div className="p-3 flex flex-col gap-2">
                  {queue.map((ticket, index) => (
                    <div
                      key={ticket.id}
                      className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                      style={{
                        backgroundColor:
                          ticket.priority === "VIP"
                            ? "rgba(242,153,74,0.05)"
                            : "var(--color-bg)",
                        borderColor:
                          ticket.priority === "VIP"
                            ? "rgba(242,153,74,0.3)"
                            : "#E5E7EB",
                      }}
                    >
                      {/* Position */}
                      <div
                        className="w-6 h-6 rounded-full flex items-center
                          justify-center text-xs font-bold shrink-0"
                        style={{
                          backgroundColor:
                            index === 0 ? "var(--color-primary)" : "#E5E7EB",
                          color:
                            index === 0
                              ? "white"
                              : "var(--color-text-secondary)",
                        }}
                      >
                        {index + 1}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className="text-sm font-bold"
                            style={{ color: "var(--color-dark)" }}
                          >
                            {ticket.ticketNumber}
                          </p>
                          {ticket.priority === "VIP" && (
                            <Badge
                              style={{
                                backgroundColor: "var(--color-warning)",
                                color: "white",
                                fontSize: "10px",
                                padding: "1px 6px",
                              }}
                            >
                              VIP
                            </Badge>
                          )}
                        </div>
                        <p
                          className="text-xs truncate"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {ticket.clientName}
                        </p>
                        <div
                          className="flex items-center gap-1 text-xs mt-0.5"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          <Clock size={10} />
                          {formatTime(ticket.issuedAt)}
                          <span className="mx-1">·</span>
                          {ticket.serviceName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </aside>
        </div>

        {/* ── MODAL TRANSFERT ── */}
        <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: "var(--color-dark)" }}>
                Transférer le ticket
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p
                className="text-sm mb-4"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Sélectionnez le service vers lequel transférer le client.
              </p>
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un service..." />
                </SelectTrigger>
                <SelectContent>
                  {services
                    .filter((s) => s.id !== activeTicket?.id)
                    .map((service) => (
                      <SelectItem key={service.id} value={String(service.id)}>
                        {service.name} — {service.code}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={!selectedServiceId || transferLoading}
                style={{
                  backgroundColor: "var(--color-primary)",
                  color: "white",
                }}
              >
                <ArrowRightLeft size={16} className="mr-1" />
                {transferLoading ? "Transfert..." : "Confirmer le transfert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
