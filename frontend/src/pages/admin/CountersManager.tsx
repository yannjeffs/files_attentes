import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Pencil, CheckCircle, XCircle,
  Search, RefreshCw, AlertCircle, Monitor, Settings, User
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import { useAuthStore } from '../../store/authStore';
import type { Counter, Service } from '../../@types';
import { counterService } from '../../services/counterService';
import { serviceService } from '../../services/serviceService';
import { userService } from '../../services/userService';

const emptyForm = { number: '', name: '' };

export default function CountersManager() {
  const { user } = useAuthStore();

  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Guichet → Service (via ServiceCounter) et Guichet → Agent assigné
  const [counterServiceMap, setCounterServiceMap] =
    useState<Record<number, Service>>({});
  const [counterAgentMap, setCounterAgentMap] =
    useState<Record<number, string>>({});

  // Modal création/édition
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCounter, setEditingCounter] = useState<Counter | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // ── Filtre via useMemo ────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return counters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        String(c.number).includes(q)
    );
  }, [search, counters]);

  // ── Chargement ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetch = async () => {
      try {
        const [countersData, servicesData, agentsData] = await Promise.all([
          counterService.getAll(user.agencyId),
          serviceService.getAll(user.agencyId),
          userService.getAll(user.agencyId),
        ]);
        if (cancelled) return;
        setCounters(countersData);

        // Construire la map guichet → service en interrogeant
        // les guichets assignés à chaque service
        const serviceLinks = await Promise.all(
          servicesData.map(async (service) => {
            const linkedCounters = await counterService.getByService(service.id);
            return { service, linkedCounters };
          })
        );
        if (cancelled) return;

        const svcMap: Record<number, Service> = {};
        serviceLinks.forEach(({ service, linkedCounters }) => {
          linkedCounters.forEach((c) => {
            svcMap[c.id] = service;
          });
        });
        setCounterServiceMap(svcMap);

        // Map guichet → agent assigné
        const agtMap: Record<number, string> = {};
        agentsData.forEach((agent) => {
          if (agent.counterId) {
            agtMap[agent.counterId] = `${agent.firstName} ${agent.lastName}`;
          }
        });
        setCounterAgentMap(agtMap);
      } catch {
        if (!cancelled) setError('Impossible de charger les guichets.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [user?.agencyId, user]);

  // ── Ouvrir modal création ─────────────────────────────────────
  const openCreate = () => {
    setEditingCounter(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  // ── Ouvrir modal édition ──────────────────────────────────────
  const openEdit = (counter: Counter) => {
    setEditingCounter(counter);
    setForm({
      number: String(counter.number),
      name: counter.name,
    });
    setFormError('');
    setModalOpen(true);
  };

  // ── Soumettre ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.number.trim()) {
      setFormError('Le numéro de guichet est obligatoire.');
      return;
    }
    if (isNaN(Number(form.number)) || Number(form.number) < 1) {
      setFormError('Le numéro doit être un entier positif.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Le nom du guichet est obligatoire.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      if (editingCounter) {
        const updated = await counterService.update(editingCounter.id, {
          number: Number(form.number),
          name: form.name.trim(),
          isActive: editingCounter.isActive,
        });
        setCounters((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      } else {
        const created = await counterService.create({
          number: Number(form.number),
          name: form.name.trim(),
          agencyId: user!.agencyId,
        });
        setCounters((prev) => [...prev, created]);
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
  const handleToggleActive = async (counter: Counter) => {
    try {
      if (counter.isActive) {
        await counterService.delete(counter.id);
        setCounters((prev) =>
          prev.map((c) =>
            c.id === counter.id ? { ...c, isActive: false } : c
          )
        );
      } else {
        const updated = await counterService.update(counter.id, {
          number: counter.number,
          name: counter.name,
          isActive: true,
        });
        setCounters((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      }
    } catch {
      setError('Impossible de modifier le statut du guichet.');
    }
  };

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
            Gestion des guichets
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {counters.filter((c) => c.isActive).length} guichet(s) actif(s)
            sur {counters.length} au total
          </p>
        </div>
        <Button
          onClick={openCreate}
          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
        >
          <Plus size={16} className="mr-2" />
          Nouveau guichet
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
        </div>
      )}

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
          placeholder="Rechercher un guichet..."
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

      {/* Grille des guichets */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Monitor
            size={40}
            style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }}
          />
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {search
              ? 'Aucun guichet ne correspond à votre recherche.'
              : 'Aucun guichet créé pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((counter) => (
            <Card
              key={counter.id}
              className="border shadow-sm hover:shadow-md transition-shadow"
              style={{
                borderLeft: `4px solid ${
                  counter.isActive
                    ? 'var(--color-primary)'
                    : '#E5E7EB'
                }`,
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  {/* Numéro */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center
                      justify-center text-xl font-bold"
                    style={{
                      backgroundColor: counter.isActive
                        ? 'rgba(74,158,232,0.1)'
                        : '#F3F4F6',
                      color: counter.isActive
                        ? 'var(--color-primary)'
                        : 'var(--color-text-secondary)',
                    }}
                  >
                    {counter.number}
                  </div>

                  {/* Badge statut */}
                  <Badge
                    style={{
                      backgroundColor: counter.isActive
                        ? 'rgba(39,174,96,0.1)'
                        : 'rgba(107,114,128,0.1)',
                      color: counter.isActive
                        ? 'var(--color-success)'
                        : 'var(--color-text-secondary)',
                      border: 'none',
                    }}
                  >
                    {counter.isActive ? '● Actif' : '○ Inactif'}
                  </Badge>
                </div>

                {/* Nom */}
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: 'var(--color-dark)' }}
                >
                  {counter.name}
                </p>

                {/* Service lié */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Settings
                    size={12}
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                  {counterServiceMap[counter.id] ? (
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {counterServiceMap[counter.id].name}
                    </span>
                  ) : (
                    <span
                      className="text-xs italic"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Aucun service assigné
                    </span>
                  )}
                </div>

                {/* Agent assigné */}
                <div className="flex items-center gap-1.5 mb-3">
                  <User
                    size={12}
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                  {counterAgentMap[counter.id] ? (
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--color-dark)' }}
                    >
                      {counterAgentMap[counter.id]}
                    </span>
                  ) : (
                    <span
                      className="text-xs italic"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      Aucun agent assigné
                    </span>
                  )}
                </div>

                <p
                  className="text-xs mb-4"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Créé le{' '}
                  {new Date(counter.createdAt).toLocaleDateString('fr-FR')}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(counter)}
                    className="flex-1"
                    style={{
                      borderColor: 'var(--color-primary)',
                      color: 'var(--color-primary)',
                    }}
                  >
                    <Pencil size={13} className="mr-1" />
                    Modifier
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(counter)}
                    className="flex-1"
                    style={{
                      borderColor: counter.isActive
                        ? 'var(--color-danger)'
                        : 'var(--color-success)',
                      color: counter.isActive
                        ? 'var(--color-danger)'
                        : 'var(--color-success)',
                    }}
                  >
                    {counter.isActive ? (
                      <>
                        <XCircle size={13} className="mr-1" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <CheckCircle size={13} className="mr-1" />
                        Réactiver
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── MODAL Création / Édition ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-dark)' }}>
              {editingCounter ? 'Modifier le guichet' : 'Nouveau guichet'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">

            {/* Numéro */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Numéro du guichet{' '}
                <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.number}
                onChange={(e) =>
                  setForm({ ...form, number: e.target.value })
                }
                placeholder="ex : 1"
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

            {/* Nom */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Nom du guichet{' '}
                <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="ex : Guichet 1"
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
              <p
                className="text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Ce nom sera affiché sur l'écran public lors de l'appel
                d'un ticket.
              </p>
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
                  {editingCounter ? 'Mise à jour...' : 'Création...'}
                </span>
              ) : editingCounter ? (
                'Enregistrer les modifications'
              ) : (
                'Créer le guichet'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}