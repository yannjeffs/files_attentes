import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import {
  CheckCircle, Clock, Users, Bell, Phone,
  Home, Landmark, AlertCircle, Pencil, X,
  Wifi, WifiOff, Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import { ticketService } from '../../services/ticketService';
import type {
  Ticket, TicketPosition, PositionUpdate,
  TicketUpdateClientRequest
} from '../../@types';

// ── Types locaux ──────────────────────────────────────────────────────────────

// Une notification affichée sur la page
interface TrackingNotification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  time: string;
}

// Une étape de la timeline
interface TimelineStep {
  id: string;
  label: string;
  description: string;
  time?: string;
  status: 'done' | 'active' | 'pending';
  icon: React.ReactNode;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Formater l'heure courante
const now = () =>
  new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

// ── Composant principal ───────────────────────────────────────────────────────
export default function TicketTracking() {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const location = useLocation();

  // ── États principaux ───────────────────────────────────────────────────────
  const [ticket, setTicket] = useState<Ticket | null>(
    location.state?.ticket ?? null
  );
  const [position, setPosition] = useState<TicketPosition | null>(null);
  const [loading, setLoading] = useState(!location.state?.ticket);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  // Notifications reçues sur cette page
  const [notifications, setNotifications] = useState<TrackingNotification[]>([]);

  // Modal modification infos
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ phone: '', email: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Modal annulation
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Référence connexion SignalR
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // ── Ajouter une notification à la liste ───────────────────────────────────
  const addNotification = (
    message: string,
    type: TrackingNotification['type'] = 'info'
  ) => {
    const notif: TrackingNotification = {
      id: crypto.randomUUID(),
      type,
      message,
      time: now(),
    };
    // On ajoute en tête de liste — la plus récente en premier
    setNotifications((prev) => [notif, ...prev]);
  };

  // ── Chargement initial du ticket ──────────────────────────────────────────
  useEffect(() => {
    if (!ticketId) return;

    const fetchTicket = async () => {
      try {
        // Si on a le ticket via state React Router, on l'utilise directement
        // Sinon on le charge depuis l'API
        const t = ticket ?? await ticketService.getById(Number(ticketId));
        setTicket(t);

        // Charger la position initiale depuis l'API
        const pos = await ticketService.getPosition(Number(ticketId));
        setPosition(pos);

        // Pré-remplir le formulaire d'édition
        setEditForm({
          phone: t.clientPhone ?? '',
          email: '',
        });
      } catch {
        setError('Impossible de charger les informations du ticket.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId, ticket]);

  // ── Connexion SignalR ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ticket) return;
    if (connectionRef.current) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5180/hubs/queue')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // ── Événement : position mise à jour ──────────────────────────────────
    // Déclenché quand un ticket est appelé avant le nôtre
    // On reçoit l'objet PositionUpdate qui contient :
    // - ticketId : l'id du ticket dont la position a changé
    // - peopleAhead : nouveau nombre de personnes avant lui
    // - estimatedWaitTime : nouveau temps estimé
    connection.on('PositionUpdated', (update: PositionUpdate) => {
      // On vérifie que c'est bien notre ticket qui est concerné
      if (update.ticketId !== Number(ticketId)) return;

      // On met à jour la position localement sans recharger l'API
      setPosition((prev) =>
        prev
          ? {
              ...prev,
              peopleAhead: update.peopleAhead,
              estimatedWaitTime: update.estimatedWaitTime,
            }
          : prev
      );

      // Ajouter une notification selon la position
      if (update.peopleAhead === 1) {
        addNotification(
          "⚡ Vous êtes le suivant ! Préparez-vous à vous présenter au guichet.",
          'warning'
        );
      } else if (update.peopleAhead === 3) {
        addNotification(
          `⏳ Plus que 3 personnes avant vous (~${update.estimatedWaitTime} min).`,
          'info'
        );
      } else if (update.peopleAhead === 5) {
        addNotification(
          `📊 Plus que 5 personnes avant vous (~${update.estimatedWaitTime} min).`,
          'info'
        );
      } else {
        addNotification(
          `📊 Position mise à jour : ${update.peopleAhead} personne(s) avant vous.`,
          'info'
        );
      }
    });

    // ── Événement : ticket appelé ─────────────────────────────────────────
    // Déclenché quand c'est notre tour
    connection.on('TicketCalled', (calledTicket: Ticket) => {
      if (calledTicket.ticketNumber !== ticket.ticketNumber) return;

      // Mettre à jour le ticket et la position
      setTicket(calledTicket);
      setPosition((prev) =>
        prev
          ? { ...prev, peopleAhead: 0, estimatedWaitTime: 0,
              status: 'Called', counterNumber: calledTicket.counterNumber }
          : prev
      );

      // Notification importante
      addNotification(
        `🔔 C'est votre tour ! Présentez-vous au guichet ${calledTicket.counterNumber}.`,
        'success'
      );

      // Notification navigateur si permission accordée
      if (Notification.permission === 'granted') {
        new Notification("🔔 C'est votre tour !", {
          body: `Guichet ${calledTicket.counterNumber} — Ticket ${calledTicket.ticketNumber}`,
          icon: '/favicon.ico',
        });
      }

      // Supprimer le ticket actif du localStorage
      localStorage.removeItem('qora_active_ticket');
    });

    // ── Événement : ticket démarré ────────────────────────────────────────
    connection.on('TicketStarted', (startedTicket: Ticket) => {
      if (startedTicket.ticketNumber !== ticket.ticketNumber) return;
      setTicket(startedTicket);
      addNotification(
        '✅ Votre traitement a démarré. L\'agent s\'occupe de vous.',
        'success'
      );
    });

    // ── Événement : ticket terminé ────────────────────────────────────────
    connection.on('TicketCompleted', (completedTicket: Ticket) => {
      if (completedTicket.ticketNumber !== ticket.ticketNumber) return;
      setTicket(completedTicket);
      addNotification(
        '✅ Votre ticket a été traité avec succès. Merci de votre visite !',
        'success'
      );
    });

    // Démarrer la connexion et rejoindre le groupe de l'agence
    connection.start()
      .then(async () => {
        setConnected(true);
        await connection.invoke('JoinGroup', `agency-1`);
      })
      .catch(() => setConnected(false));

    connection.onreconnected(() => {
      setConnected(true);
      addNotification('🔌 Reconnexion établie — suivi temps réel actif.', 'info');
    });

    connection.onreconnecting(() => setConnected(false));

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      connection.stop();
      connectionRef.current = null;
    };
  }, [ticket?.ticketNumber, ticketId, ticket]);

  // ── Annuler le ticket ─────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!ticketId) return;
    setCancelLoading(true);
    try {
      await ticketService.cancel(Number(ticketId));
      localStorage.removeItem('qora_active_ticket');
      navigate('/');
    } catch {
      addNotification(
        'Impossible d\'annuler ce ticket. Veuillez réessayer.',
        'error'
      );
    } finally {
      setCancelLoading(false);
      setCancelOpen(false);
    }
  };

  // ── Modifier les infos client ─────────────────────────────────────────────
  const handleEdit = async () => {
    if (!ticketId) return;
    if (!editForm.phone.trim()) {
      setEditError('Le numéro de téléphone est obligatoire.');
      return;
    }

    setEditLoading(true);
    setEditError('');
    try {
      const updated = await ticketService.updateClient(
        Number(ticketId),
        {
          phone: editForm.phone.trim(),
          email: editForm.email.trim() || undefined,
        } as TicketUpdateClientRequest
      );
      setTicket(updated);
      setEditOpen(false);
      addNotification(
        '✅ Vos informations de contact ont été mises à jour.',
        'success'
      );
    } catch {
      setEditError('Impossible de mettre à jour vos informations.');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Construction de la timeline ───────────────────────────────────────────
  // La timeline représente les étapes du parcours du ticket
  // Chaque étape a un statut : done (passé), active (en cours), pending (futur)
  const buildTimeline = (): TimelineStep[] => {
    if (!ticket) return [];

    // On détermine le statut actuel pour positionner les étapes
    const s = ticket.status;

    return [
      {
        id: 'created',
        label: 'Ticket créé',
        description: 'Votre ticket a été enregistré dans la file d\'attente.',
        // L'heure de création du ticket
        time: ticket.issuedAt
          ? new Date(ticket.issuedAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit', minute: '2-digit',
            })
          : undefined,
        // L'étape "créé" est toujours terminée
        status: 'done',
        icon: <CheckCircle size={16} />,
      },
      {
        id: 'waiting',
        label: 'En attente',
        description: position
          ? `${position.peopleAhead} personne(s) avant vous — attente estimée : ${position.estimatedWaitTime} min`
          : 'En attente dans la file...',
        status:
          s === 'Waiting'
            ? 'active'  // c'est l'étape en cours
            : s === 'Called' || s === 'InProgress' || s === 'Done'
            ? 'done'    // déjà passée
            : 'pending',
        icon: <Clock size={16} />,
      },
      {
        id: 'called',
        label: 'Appelé au guichet',
        description:
          position?.counterNumber
            ? `Présentez-vous au guichet ${position.counterNumber}`
            : 'En attente d\'appel...',
        time: ticket.calledAt
          ? new Date(ticket.calledAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit', minute: '2-digit',
            })
          : undefined,
        status:
          s === 'Called'
            ? 'active'
            : s === 'InProgress' || s === 'Done'
            ? 'done'
            : 'pending',
        icon: <Bell size={16} />,
      },
      {
        id: 'inprogress',
        label: 'En cours de traitement',
        description: 'L\'agent traite votre demande au guichet.',
        time: ticket.startedAt
          ? new Date(ticket.startedAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit', minute: '2-digit',
            })
          : undefined,
        status:
          s === 'InProgress'
            ? 'active'
            : s === 'Done'
            ? 'done'
            : 'pending',
        icon: <Users size={16} />,
      },
      {
        id: 'done',
        label: 'Service rendu',
        description: 'Votre demande a été traitée avec succès.',
        time: ticket.endedAt
          ? new Date(ticket.endedAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit', minute: '2-digit',
            })
          : undefined,
        status: s === 'Done' ? 'done' : 'pending',
        icon: <CheckCircle size={16} />,
      },
    ];
  };

  // ── Couleur des notifications ─────────────────────────────────────────────
  const notifStyle = (type: TrackingNotification['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'rgba(39,174,96,0.08)',
          border: 'rgba(39,174,96,0.2)',
          color: 'var(--color-success)',
        };
      case 'warning':
        return {
          bg: 'rgba(242,153,74,0.08)',
          border: 'rgba(242,153,74,0.2)',
          color: 'var(--color-warning)',
        };
      case 'error':
        return {
          bg: 'rgba(235,87,87,0.08)',
          border: 'rgba(235,87,87,0.2)',
          color: 'var(--color-danger)',
        };
      default:
        return {
          bg: 'rgba(74,158,232,0.08)',
          border: 'rgba(74,158,232,0.2)',
          color: 'var(--color-primary)',
        };
    }
  };

  // ── États de chargement et d'erreur ──────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-4 animate-spin"
            style={{
              borderColor: 'var(--color-primary)',
              borderTopColor: 'transparent',
            }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Chargement du suivi...
          </p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="text-center">
          <AlertCircle
            size={48}
            color="var(--color-danger)"
            className="mx-auto mb-4"
          />
          <p
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--color-danger)' }}
          >
            {error || 'Ticket introuvable.'}
          </p>
          <Button
            onClick={() => navigate('/')}
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const timeline = buildTimeline();
  const isCalled = ticket.status === 'Called' || ticket.status === 'InProgress';
  const isDone = ticket.status === 'Done';
  const isWaiting = ticket.status === 'Waiting';

  // ── Rendu principal ───────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* ── HEADER ── */}
      <header
        className="w-full px-6 py-4 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: 'var(--color-dark)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary)' }}
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
            <p className="text-xs" style={{ color: 'var(--color-primary)' }}>
              Suivi de ticket
            </p>
          </div>
        </div>

        {/* Indicateur connexion temps réel */}
        <div className="flex items-center gap-2">
          {connected
            ? <Wifi size={14} color="var(--color-success)" />
            : <WifiOff size={14} color="var(--color-danger)" />
          }
          <span className="text-xs" style={{ color: 'var(--color-primary)' }}>
            {connected ? 'Temps réel actif' : 'Reconnexion...'}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* ── ALERTE — C'EST SON TOUR ── */}
        {isCalled && (
          <div
            className="rounded-2xl p-5 mb-6 text-center"
            style={{
              backgroundColor: 'rgba(39,174,96,0.1)',
              border: '2px solid var(--color-success)',
            }}
          >
            <Bell
              size={32}
              color="var(--color-success)"
              className="mx-auto mb-2"
            />
            <p
              className="text-xl font-bold"
              style={{ color: 'var(--color-success)' }}
            >
              🎉 C'est votre tour !
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Présentez-vous au{' '}
              <strong style={{ color: 'var(--color-success)' }}>
                Guichet {position?.counterNumber}
              </strong>
            </p>
          </div>
        )}

        {/* ── CARTE TICKET ── */}
        <Card className="mb-6 shadow-sm overflow-hidden">
          {/* En-tête carte */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ backgroundColor: 'var(--color-dark)' }}
          >
            <div className="flex items-center gap-2">
              <Landmark size={16} color="white" />
              <span className="text-white text-sm font-semibold">
                SCB Cameroun
              </span>
            </div>
            <Badge
              style={{
                backgroundColor: isCalled
                  ? 'var(--color-success)'
                  : isDone
                  ? 'var(--color-success)'
                  : 'var(--color-primary)',
                color: 'white',
              }}
            >
              {isCalled
                ? '🔔 Appelé'
                : isDone
                ? '✅ Terminé'
                : '⏳ En attente'}
            </Badge>
          </div>

          <CardContent className="pt-6 pb-4">
            {/* Numéro de ticket */}
            <div className="text-center mb-6">
              <p
                className="text-xs font-medium tracking-widest uppercase mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Numéro de ticket
              </p>
              <p
                className="text-5xl font-bold tracking-wide"
                style={{
                  color: isCalled || isDone
                    ? 'var(--color-success)'
                    : 'var(--color-primary)',
                }}
              >
                {ticket.ticketNumber}
              </p>
              <p
                className="text-sm mt-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {ticket.serviceName}
              </p>
              {isCalled && position?.counterNumber && (
                <p
                  className="text-base font-bold mt-1"
                  style={{ color: 'var(--color-success)' }}
                >
                  → Guichet {position.counterNumber}
                </p>
              )}
            </div>

            {/* Métriques */}
            {isWaiting && position && (
              <div
                className="grid grid-cols-2 gap-3 mb-4"
              >
                <div
                  className="flex flex-col items-center py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--color-bg)' }}
                >
                  <Users
                    size={18}
                    style={{ color: 'var(--color-primary)' }}
                  />
                  <p
                    className="text-2xl font-bold mt-1"
                    style={{ color: 'var(--color-dark)' }}
                  >
                    {position.peopleAhead}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    personne(s) avant vous
                  </p>
                </div>

                <div
                  className="flex flex-col items-center py-3 rounded-xl"
                  style={{ backgroundColor: 'var(--color-bg)' }}
                >
                  <Clock
                    size={18}
                    style={{ color: 'var(--color-primary)' }}
                  />
                  <p
                    className="text-2xl font-bold mt-1"
                    style={{ color: 'var(--color-dark)' }}
                  >
                    ~{position.estimatedWaitTime}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    minutes estimées
                  </p>
                </div>
              </div>
            )}

            {/* Barre de progression */}
            {isWaiting && position && position.peopleAhead > 0 && (
              <div className="mb-2">
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: '#E5E7EB' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      // Plus il y a de monde, moins la barre est remplie
                      width: `${Math.max(5, 100 - position.peopleAhead * 10)}%`,
                    }}
                  />
                </div>
                <p
                  className="text-xs text-right mt-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Position {position.position} dans la file
                </p>
              </div>
            )}

            {/* Notification WhatsApp */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mt-3"
              style={{
                backgroundColor: 'rgba(39,174,96,0.06)',
                border: '1px solid rgba(39,174,96,0.15)',
              }}
            >
              <Phone size={14} color="var(--color-success)" />
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Vous serez notifié sur WhatsApp à chaque étape importante.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── TIMELINE ── */}
        <Card className="mb-6 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle
              className="text-sm font-semibold"
              style={{ color: 'var(--color-dark)' }}
            >
              Progression de votre ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              {timeline.map((step, index) => (
                <div key={step.id} className="flex gap-3">
                  {/* Ligne verticale + point */}
                  <div className="flex flex-col items-center">
                    {/* Point de la timeline */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center
                        justify-center shrink-0 z-10"
                      style={{
                        backgroundColor:
                          step.status === 'done'
                            ? 'var(--color-success)'
                            : step.status === 'active'
                            ? 'var(--color-primary)'
                            : '#E5E7EB',
                        color:
                          step.status === 'pending'
                            ? 'var(--color-text-secondary)'
                            : 'white',
                      }}
                    >
                      {step.icon}
                    </div>
                    {/* Ligne verticale entre les points */}
                    {index < timeline.length - 1 && (
                      <div
                        className="w-0.5 flex-1 my-1"
                        style={{
                          backgroundColor:
                            step.status === 'done'
                              ? 'var(--color-success)'
                              : '#E5E7EB',
                          minHeight: '24px',
                        }}
                      />
                    )}
                  </div>

                  {/* Contenu de l'étape */}
                  <div className="pb-5 flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className="text-sm font-semibold"
                        style={{
                          color:
                            step.status === 'active'
                              ? 'var(--color-primary)'
                              : step.status === 'done'
                              ? 'var(--color-success)'
                              : 'var(--color-text-secondary)',
                        }}
                      >
                        {step.label}
                      </p>
                      {step.time && (
                        <span
                          className="text-xs"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {step.time}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── NOTIFICATIONS REÇUES ── */}
        {notifications.length > 0 && (
          <Card className="mb-6 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: 'var(--color-dark)' }}
              >
                <Bell size={16} style={{ color: 'var(--color-primary)' }} />
                Notifications reçues
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-48">
                <div className="px-4 pb-4 flex flex-col gap-2">
                  {notifications.map((notif) => {
                    const style = notifStyle(notif.type);
                    return (
                      <div
                        key={notif.id}
                        className="flex items-start gap-2 px-3 py-2 rounded-xl"
                        style={{
                          backgroundColor: style.bg,
                          border: `1px solid ${style.border}`,
                        }}
                      >
                        <div className="flex-1">
                          <p
                            className="text-xs"
                            style={{ color: style.color }}
                          >
                            {notif.message}
                          </p>
                        </div>
                        <span
                          className="text-xs shrink-0 mt-0.5"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {notif.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* ── ACTIONS ── */}
        {isWaiting && (
          <div className="flex gap-3">
            {/* Modifier infos */}
            <Button
              variant="outline"
              onClick={() => {
                setEditForm({
                  phone: ticket.clientPhone ?? '',
                  email: '',
                });
                setEditOpen(true);
              }}
              className="flex items-center gap-2"
              style={{
                borderColor: 'var(--color-primary)',
                color: 'var(--color-primary)',
              }}
            >
              <Pencil size={15} />
              Modifier mes infos
            </Button>

            {/* Annuler ticket */}
            <Button
              variant="outline"
              onClick={() => setCancelOpen(true)}
              className="flex items-center gap-2"
              style={{
                borderColor: 'var(--color-danger)',
                color: 'var(--color-danger)',
              }}
            >
              <Trash2 size={15} />
              Annuler mon ticket
            </Button>
          </div>
        )}

        {/* Bouton retour accueil si terminé */}
        {isDone && (
          <Button
            onClick={() => navigate('/')}
            className="w-full"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <Home size={16} className="mr-2" />
            Retour à l'accueil
          </Button>
        )}
      </main>

      {/* ── MODAL MODIFICATION INFOS ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-dark)' }}>
              Modifier mes informations
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Vous pouvez uniquement modifier vos informations de contact.
              Le service sélectionné ne peut pas être modifié.
            </p>

            {/* Téléphone */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Téléphone WhatsApp *
              </label>
              <input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                placeholder="+237690000000"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{
                  borderColor: editError ? 'var(--color-danger)' : '#E5E7EB',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Email{' '}
                <span
                  className="text-xs font-normal"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  (optionnel)
                </span>
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="exemple@email.com"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{
                  borderColor: '#E5E7EB',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
              />
            </div>

            {editError && (
              <p
                className="text-sm"
                style={{ color: 'var(--color-danger)' }}
              >
                {editError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              <X size={15} className="mr-1" />
              Annuler
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editLoading}
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              {editLoading ? 'Mise à jour...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL ANNULATION ── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-danger)' }}>
              Annuler mon ticket
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Êtes-vous sûr de vouloir annuler votre ticket{' '}
              <strong style={{ color: 'var(--color-dark)' }}>
                {ticket.ticketNumber}
              </strong>{' '}
              ? Cette action est irréversible.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
            >
              Garder mon ticket
            </Button>
            <Button
              onClick={handleCancel}
              disabled={cancelLoading}
              style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}
            >
              <Trash2 size={15} className="mr-1" />
              {cancelLoading ? 'Annulation...' : 'Confirmer l\'annulation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="text-center py-6">
        <p
          className="text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          © 2024 Qora — SCB Cameroun. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}