import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Pencil, CheckCircle, XCircle,
  Search, RefreshCw, AlertCircle, Users,
  Shield, User
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '../../components/ui/select';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────
interface Agent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'Admin' | 'Agent';
  isActive: boolean;
  agencyId: number;
  createdAt: string;
}

interface AgentCreateDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  agencyId: number;
}

// ── Service agents ─────────────────────────────────────────────────
const agentService = {
  getAll: async (agencyId: number): Promise<Agent[]> => {
    const res = await api.get<Agent[]>(
      `/users?agencyId=${agencyId}`
    );
    return res.data;
  },
  create: async (data: AgentCreateDto): Promise<Agent> => {
    const res = await api.post<Agent>('/auth/register', data);
    return res.data;
  },
  update: async (id: number, data: object): Promise<Agent> => {
    const res = await api.put<Agent>(`/users/${id}`, data);
    return res.data;
  },
  toggleActive: async (id: number, isActive: boolean): Promise<Agent> => {
    const res = await api.put<Agent>(`/users/${id}/toggle-active`, {
      isActive,
    });
    return res.data;
  },
};

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  role: 'Agent',
};

export default function AgentsManager() {
  const { user } = useAuthStore();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Modal création/édition
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // ── Filtre ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return agents.filter(
      (a) =>
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
    );
  }, [search, agents]);

  // ── Stats rapides ─────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: agents.length,
    active: agents.filter((a) => a.isActive).length,
    admins: agents.filter((a) => a.role === 'Admin').length,
    agents: agents.filter((a) => a.role === 'Agent').length,
  }), [agents]);

  // ── Chargement ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchAgents = async () => {
      try {
        const data = await agentService.getAll(user.agencyId);
        if (!cancelled) setAgents(data);
      } catch {
        if (!cancelled)
          setError('Impossible de charger les agents.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAgents();
    return () => { cancelled = true; };
  }, [user?.agencyId, user]);

  // ── Ouvrir modal création ─────────────────────────────────────
  const openCreate = () => {
    setEditingAgent(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  // ── Ouvrir modal édition ──────────────────────────────────────
  const openEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setForm({
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      password: '',
      phone: agent.phone ?? '',
      role: agent.role,
    });
    setFormError('');
    setModalOpen(true);
  };

  // ── Soumettre ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.firstName.trim()) {
      setFormError('Le prénom est obligatoire.');
      return;
    }
    if (!form.lastName.trim()) {
      setFormError('Le nom est obligatoire.');
      return;
    }
    if (!form.email.trim()) {
      setFormError("L'email est obligatoire.");
      return;
    }
    if (!editingAgent && !form.password.trim()) {
      setFormError('Le mot de passe est obligatoire.');
      return;
    }
    if (!editingAgent && form.password.length < 6) {
      setFormError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      if (editingAgent) {
        // Mise à jour
        const updated = await agentService.update(editingAgent.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          role: form.role,
        });
        setAgents((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
      } else {
        // Création via /auth/register
        await agentService.create({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          role: form.role,
          agencyId: user!.agencyId,
        });
        // Recharger la liste
        const data = await agentService.getAll(user!.agencyId);
        setAgents(data);
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setFormError(message || "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Activer / Désactiver ──────────────────────────────────────
  const handleToggleActive = async (agent: Agent) => {
    // Empêcher de désactiver son propre compte
    if (agent.id === user?.id) {
      setError('Vous ne pouvez pas désactiver votre propre compte.');
      return;
    }
    try {
      const updated = await agentService.toggleActive(
        agent.id, !agent.isActive
      );
      setAgents((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
    } catch {
      setError('Impossible de modifier le statut de cet agent.');
    }
  };

  // ── Helpers ───────────────────────────────────────────────────
  const getInitials = (firstName: string, lastName: string) =>
    `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw
          size={28}
          className="animate-spin"
          style={{ color: 'var(--color-primary)' }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--color-dark)' }}
          >
            Gestion des agents
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {stats.active} agent(s) actif(s) sur {stats.total} au total
          </p>
        </div>
        <Button
          onClick={openCreate}
          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
        >
          <Plus size={16} className="mr-2" />
          Nouvel agent
        </Button>
      </div>

      {/* Erreur globale */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: '#FEE2E2', color: 'var(--color-danger)' }}
        >
          <AlertCircle size={16} />
          {error}
          <button
            onClick={() => setError('')}
            className="ml-auto"
            style={{ color: 'var(--color-danger)' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: <Users size={18}/>, color: 'var(--color-primary)' },
          { label: 'Actifs', value: stats.active, icon: <CheckCircle size={18}/>, color: 'var(--color-success)' },
          { label: 'Admins', value: stats.admins, icon: <Shield size={18}/>, color: 'var(--color-warning)' },
          { label: 'Agents', value: stats.agents, icon: <User size={18}/>, color: 'var(--color-primary)' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}
              >
                {kpi.icon}
              </div>
              <div>
                <p
                  className="text-xl font-bold"
                  style={{ color: kpi.color }}
                >
                  {kpi.value}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {kpi.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-secondary)' }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un agent..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm
            outline-none transition-all"
          style={{
            borderColor: '#E5E7EB',
            backgroundColor: 'var(--color-white)',
            color: 'var(--color-text)',
          }}
          onFocus={(e) =>
            (e.target.style.borderColor = 'var(--color-primary)')
          }
          onBlur={(e) => (e.target.style.borderColor = '#E5E7EB')}
        />
      </div>

      {/* Tableau des agents */}
      <Card className="shadow-sm border">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center
              py-16 gap-3">
              <Users
                size={40}
                style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }}
              />
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {search
                  ? 'Aucun agent ne correspond à votre recherche.'
                  : 'Aucun agent créé pour le moment.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--color-bg)',
                      borderBottom: '1px solid #E5E7EB',
                    }}
                  >
                    {['Agent', 'Email', 'Rôle', 'Statut', 'Créé le', 'Actions'].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agent, index) => (
                    <tr
                      key={agent.id}
                      style={{
                        borderBottom:
                          index < filtered.length - 1
                            ? '1px solid #F3F4F6'
                            : 'none',
                        backgroundColor:
                          index % 2 === 0
                            ? 'var(--color-white)'
                            : 'var(--color-bg)',
                      }}
                    >
                      {/* Avatar + Nom */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback
                              style={{
                                backgroundColor:
                                  agent.role === 'Admin'
                                    ? 'rgba(242,153,74,0.15)'
                                    : 'rgba(74,158,232,0.15)',
                                color:
                                  agent.role === 'Admin'
                                    ? 'var(--color-warning)'
                                    : 'var(--color-primary)',
                                fontSize: '11px',
                              }}
                            >
                              {getInitials(agent.firstName, agent.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p
                              className="text-sm font-medium"
                              style={{ color: 'var(--color-dark)' }}
                            >
                              {agent.firstName} {agent.lastName}
                              {agent.id === user?.id && (
                                <span
                                  className="ml-2 text-xs px-1.5 py-0.5
                                    rounded-md"
                                  style={{
                                    backgroundColor: 'rgba(74,158,232,0.1)',
                                    color: 'var(--color-primary)',
                                  }}
                                >
                                  Vous
                                </span>
                              )}
                            </p>
                            {agent.phone && (
                              <p
                                className="text-xs"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                {agent.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        <p
                          className="text-sm"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {agent.email}
                        </p>
                      </td>

                      {/* Rôle */}
                      <td className="px-4 py-3">
                        <Badge
                          style={{
                            backgroundColor:
                              agent.role === 'Admin'
                                ? 'rgba(242,153,74,0.12)'
                                : 'rgba(74,158,232,0.1)',
                            color:
                              agent.role === 'Admin'
                                ? 'var(--color-warning)'
                                : 'var(--color-primary)',
                            border: 'none',
                          }}
                        >
                          {agent.role === 'Admin' ? (
                            <><Shield size={11} className="mr-1" />Admin</>
                          ) : (
                            <><User size={11} className="mr-1" />Agent</>
                          )}
                        </Badge>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <Badge
                          style={{
                            backgroundColor: agent.isActive
                              ? 'rgba(39,174,96,0.1)'
                              : 'rgba(107,114,128,0.1)',
                            color: agent.isActive
                              ? 'var(--color-success)'
                              : 'var(--color-text-secondary)',
                            border: 'none',
                          }}
                        >
                          {agent.isActive ? '● Actif' : '○ Inactif'}
                        </Badge>
                      </td>

                      {/* Date création */}
                      <td className="px-4 py-3">
                        <p
                          className="text-xs"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {formatDate(agent.createdAt)}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(agent)}
                            className="w-8 h-8"
                            title="Modifier"
                          >
                            <Pencil
                              size={15}
                              style={{ color: 'var(--color-primary)' }}
                            />
                          </Button>

                          {agent.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(agent)}
                              className="w-8 h-8"
                              title={agent.isActive ? 'Désactiver' : 'Réactiver'}
                            >
                              {agent.isActive ? (
                                <XCircle
                                  size={15}
                                  style={{ color: 'var(--color-danger)' }}
                                />
                              ) : (
                                <CheckCircle
                                  size={15}
                                  style={{ color: 'var(--color-success)' }}
                                />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODAL Création / Édition ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-dark)' }}>
              {editingAgent ? 'Modifier l\'agent' : 'Nouvel agent'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">

            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}>
                  Prénom <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  placeholder="Jean"
                  className="w-full px-4 py-3 rounded-xl border text-sm
                    outline-none transition-all"
                  style={{
                    borderColor: '#E5E7EB',
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text)',
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = 'var(--color-primary)')
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = '#E5E7EB')
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}>
                  Nom <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  placeholder="Dupont"
                  className="w-full px-4 py-3 rounded-xl border text-sm
                    outline-none transition-all"
                  style={{
                    borderColor: '#E5E7EB',
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text)',
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = 'var(--color-primary)')
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = '#E5E7EB')
                  }
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}>
                Email <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="agent@qora.cm"
                disabled={!!editingAgent}
                className="w-full px-4 py-3 rounded-xl border text-sm
                  outline-none transition-all"
                style={{
                  borderColor: '#E5E7EB',
                  backgroundColor: editingAgent
                    ? '#F3F4F6'
                    : 'var(--color-bg)',
                  color: 'var(--color-text)',
                  cursor: editingAgent ? 'not-allowed' : 'text',
                }}
                onFocus={(e) =>
                  !editingAgent &&
                  (e.target.style.borderColor = 'var(--color-primary)')
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = '#E5E7EB')
                }
              />
              {editingAgent && (
                <p className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  L'email ne peut pas être modifié.
                </p>
              )}
            </div>

            {/* Mot de passe — uniquement à la création */}
            {!editingAgent && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}>
                  Mot de passe{' '}
                  <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border text-sm
                    outline-none transition-all"
                  style={{
                    borderColor: '#E5E7EB',
                    backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text)',
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = 'var(--color-primary)')
                  }
                  onBlur={(e) =>
                    (e.target.style.borderColor = '#E5E7EB')
                  }
                />
                <p className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  Minimum 6 caractères.
                </p>
              </div>
            )}

            {/* Téléphone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}>
                Téléphone{' '}
                <span className="text-xs font-normal"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  (optionnel)
                </span>
              </label>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
                placeholder="+237690000000"
                className="w-full px-4 py-3 rounded-xl border text-sm
                  outline-none transition-all"
                style={{
                  borderColor: '#E5E7EB',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = 'var(--color-primary)')
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = '#E5E7EB')
                }
              />
            </div>

            {/* Rôle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}>
                Rôle <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <Select
                value={form.role}
                onValueChange={(val) => setForm({ ...form, role: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un rôle..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Agent">
                    <div className="flex items-center gap-2">
                      <User size={14} />
                      Agent — Gestion de la file d'attente
                    </div>
                  </SelectItem>
                  <SelectItem value="Admin">
                    <div className="flex items-center gap-2">
                      <Shield size={14} />
                      Admin — Accès complet au back-office
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Erreur */}
            {formError && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl
                  text-sm"
                style={{
                  backgroundColor: '#FEE2E2',
                  color: 'var(--color-danger)',
                }}
              >
                <AlertCircle size={15} />
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={formLoading}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
              }}
            >
              {formLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  {editingAgent ? 'Mise à jour...' : 'Création...'}
                </span>
              ) : editingAgent ? (
                'Enregistrer les modifications'
              ) : (
                'Créer l\'agent'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}