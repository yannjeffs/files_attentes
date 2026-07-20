import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Pencil, CheckCircle,
  XCircle, Search, RefreshCw, AlertCircle,
  Monitor, Settings, X, Link2, Link2Off
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import { useAuthStore } from '../../store/authStore';
import { serviceService } from '../../services/serviceService';
import { counterService, type CounterMini } from '../../services/counterService';
import type { Service } from '../../@types';

// ── Formulaire vide par défaut ────────────────────────────────────
const emptyForm = {
  name: '',
  code: '',
  description: '',
};

export default function ServicesManager() {
  const { user } = useAuthStore();

  const [services, setServices] = useState<Service[]>([]);
  const [, setFiltered] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Modal création/édition
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Modal suppression
  //const [deleteOpen, setDeleteOpen] = useState(false);
  //const [deletingService, setDeletingService] = useState<Service | null>(null);
  //const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Guichets ─────────────────────────────────────────────────
  const [allCounters, setAllCounters] = useState<CounterMini[]>([]);
  const [serviceCounters, setServiceCounters] =
    useState<Record<number, CounterMini[]>>({});
  const [countersModalOpen, setCountersModalOpen] = useState(false);
  const [managingService, setManagingService] = useState<Service | null>(null);
  const [countersLoading, setCountersLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  // ── Chargement des services ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchServices = async () => {
      try {
        const [data, counters] = await Promise.all([
          serviceService.getAll(user.agencyId),
          counterService.getAll(user.agencyId),
        ]);
        if (cancelled) return;
        setServices(data);
        setFiltered(data);
        setAllCounters(counters);

        // Construire la map service → guichets assignés
        const entries = await Promise.all(
          data.map(async (service) => {
            const linked = await counterService.getByService(service.id);
            return [service.id, linked] as const;
          })
        );
        if (cancelled) return;
        setServiceCounters(Object.fromEntries(entries));
      } catch {
        if (!cancelled)
          setError('Impossible de charger les services.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchServices();
    return () => { cancelled = true; };
  }, [user?.agencyId, user]);

  // ── Recharger les guichets d'un service (après assignation) ────
  const reloadServiceCounters = useCallback(async (serviceId: number) => {
    const linked = await counterService.getByService(serviceId);
    setServiceCounters((prev) => ({ ...prev, [serviceId]: linked }));
  }, []);

  // ── Filtre de recherche ───────────────────────────────────────
  const filtered = useMemo(() => {
  const q = search.toLowerCase();
  return services.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.description ?? '').toLowerCase().includes(q)
  );
}, [search, services]);

  // ── Ouvrir modal création ─────────────────────────────────────
  const openCreate = () => {
    setEditingService(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  };

  // ── Ouvrir modal édition ──────────────────────────────────────
  const openEdit = (service: Service) => {
    setEditingService(service);
    setForm({
      name: service.name,
      code: service.code,
      description: service.description ?? '',
    });
    setFormError('');
    setModalOpen(true);
  };

  // ── Soumettre création ou édition ─────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setFormError('Le nom du service est obligatoire.');
      return;
    }
    if (!form.code.trim()) {
      setFormError('Le code est obligatoire.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      if (editingService) {
        // Mise à jour
        const updated = await serviceService.update(
          editingService.id,
          {
            name: form.name.trim(),
            code: form.code.trim().toUpperCase(),
            description: form.description.trim() || undefined,
            isActive: editingService.isActive,
          }
        );
        setServices((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
      } else {
        // Création
        const created = await serviceService.create({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          description: form.description.trim() || undefined,
          agencyId: user!.agencyId,
        });
        setServices((prev) => [...prev, created]);
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

  // ── Désactiver / réactiver un service ─────────────────────────
  const handleToggleActive = async (service: Service) => {
    try {
      if (service.isActive) {
        // Désactivation douce
        await serviceService.delete(service.id);
        setServices((prev) =>
          prev.map((s) =>
            s.id === service.id ? { ...s, isActive: false } : s
          )
        );
      } else {
        // Réactivation — update avec isActive: true
        const updated = await serviceService.update(service.id, {
          name: service.name,
          code: service.code,
          description: service.description,
          isActive: true,
        });
        setServices((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
      }
    } catch {
      setError('Impossible de modifier le statut du service.');
    }
  };

  // ── Ouvrir le modal de gestion des guichets ────────────────────
  const openCountersModal = (service: Service) => {
    setManagingService(service);
    setCountersModalOpen(true);
  };

  // ── Assigner / désassigner un guichet au service géré ──────────
  const handleToggleCounter = async (counter: CounterMini) => {
    if (!managingService) return;
    const isLinked = (serviceCounters[managingService.id] ?? [])
      .some((c) => c.id === counter.id);

    setAssigningId(counter.id);
    setCountersLoading(true);
    try {
      if (isLinked) {
        await counterService.unassignFromService(
          managingService.id, counter.id
        );
      } else {
        await counterService.assignToService(
          managingService.id, counter.id
        );
      }
      await reloadServiceCounters(managingService.id);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(message || 'Impossible de modifier ce guichet.');
    } finally {
      setAssigningId(null);
      setCountersLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
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
            Gestion des services
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {services.filter((s) => s.isActive).length} service(s) actif(s)
            sur {services.length} au total
          </p>
        </div>
        <Button
          onClick={openCreate}
          style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
        >
          <Plus size={16} className="mr-2" />
          Nouveau service
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

      {/* Barre de recherche */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-secondary)' }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un service..."
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

      {/* Tableau des services */}
      <Card className="shadow-sm border">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle
                size={36}
                style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }}
              />
              <p style={{ color: 'var(--color-text-secondary)' }}>
                {search
                  ? 'Aucun service ne correspond à votre recherche.'
                  : 'Aucun service créé pour le moment.'}
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
                    {['Code', 'Nom', 'Description', 'Guichets', 'Statut', 'Actions'].map(
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
                  {filtered.map((service, index) => (
                    <tr
                      key={service.id}
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
                      {/* Code */}
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor: 'rgba(74,158,232,0.1)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {service.code}
                        </span>
                      </td>

                      {/* Nom */}
                      <td className="px-4 py-3">
                        <p
                          className="text-sm font-medium"
                          style={{ color: 'var(--color-dark)' }}
                        >
                          {service.name}
                        </p>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3">
                        <p
                          className="text-sm max-w-xs truncate"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {service.description || '—'}
                        </p>
                      </td>

                      {/* Guichets assignés */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-45">
                          {(serviceCounters[service.id] ?? []).length === 0 ? (
                            <span
                              className="text-xs italic"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              Aucun
                            </span>
                          ) : (
                            (serviceCounters[service.id] ?? []).map((c) => (
                              <Badge
                                key={c.id}
                                style={{
                                  backgroundColor: 'rgba(74,158,232,0.1)',
                                  color: 'var(--color-primary)',
                                  border: 'none',
                                  fontSize: '11px',
                                }}
                              >
                                <Monitor size={10} className="mr-1" />
                                {c.number}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <Badge
                          style={{
                            backgroundColor: service.isActive
                              ? 'rgba(39,174,96,0.1)'
                              : 'rgba(107,114,128,0.1)',
                            color: service.isActive
                              ? 'var(--color-success)'
                              : 'var(--color-text-secondary)',
                            border: 'none',
                          }}
                        >
                          {service.isActive ? '● Actif' : '○ Inactif'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Gérer les guichets */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openCountersModal(service)}
                            className="w-8 h-8"
                            title="Gérer les guichets"
                          >
                            <Settings
                              size={15}
                              style={{ color: 'var(--color-text-secondary)' }}
                            />
                          </Button>

                          {/* Modifier */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(service)}
                            className="w-8 h-8"
                            title="Modifier"
                          >
                            <Pencil
                              size={15}
                              style={{ color: 'var(--color-primary)' }}
                            />
                          </Button>

                          {/* Activer / Désactiver */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(service)}
                            className="w-8 h-8"
                            title={
                              service.isActive ? 'Désactiver' : 'Réactiver'
                            }
                          >
                            {service.isActive ? (
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
              {editingService ? 'Modifier le service' : 'Nouveau service'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">

            {/* Nom */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Nom du service{' '}
                <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="ex : Caisse"
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

            {/* Code */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Code unique{' '}
                <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                value={form.code}
                onChange={(e) =>
                  setForm({
                    ...form,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="ex : C"
                maxLength={10}
                className="w-full px-4 py-3 rounded-xl border text-sm
                  outline-none transition-all font-mono"
                style={{
                  borderColor: '#E5E7EB',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-primary)',
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
                Le code est utilisé pour générer les numéros de tickets
                (ex : C-001). Il doit être unique.
              </p>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: 'var(--color-text)' }}
              >
                Description{' '}
                <span
                  className="text-xs font-normal"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  (optionnel)
                </span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="ex : Dépôts, retraits et opérations de caisse"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border text-sm
                  outline-none resize-none transition-all"
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

            {/* Erreur formulaire */}
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
                  {editingService ? 'Mise à jour...' : 'Création...'}
                </span>
              ) : editingService ? (
                'Enregistrer les modifications'
              ) : (
                'Créer le service'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL Gestion des guichets ── */}
      <Dialog open={countersModalOpen} onOpenChange={setCountersModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-dark)' }}>
              Guichets — {managingService?.name}
            </DialogTitle>
          </DialogHeader>

          <p
            className="text-sm -mt-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Sélectionnez les guichets qui traiteront ce service. Un agent
            assigné à l'un de ces guichets ne verra que les clients de
            ce service.
          </p>

          <div className="flex flex-col gap-2 py-2 max-h-80 overflow-y-auto">
            {allCounters.length === 0 ? (
              <p
                className="text-sm text-center py-6"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Aucun guichet créé pour le moment.
              </p>
            ) : (
              allCounters.map((counter) => {
                const isLinked = managingService
                  ? (serviceCounters[managingService.id] ?? [])
                      .some((c) => c.id === counter.id)
                  : false;
                return (
                  <button
                    key={counter.id}
                    onClick={() => handleToggleCounter(counter)}
                    disabled={countersLoading || !counter.isActive}
                    className="w-full flex items-center gap-3 px-4 py-3
                      rounded-xl border text-left transition-all"
                    style={{
                      borderColor: isLinked
                        ? 'var(--color-primary)'
                        : '#E5E7EB',
                      backgroundColor: isLinked
                        ? 'rgba(74,158,232,0.06)'
                        : 'var(--color-white)',
                      opacity: counter.isActive ? 1 : 0.5,
                      cursor: counter.isActive ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center
                        justify-center shrink-0 text-sm font-bold"
                      style={{
                        backgroundColor: isLinked
                          ? 'var(--color-primary)'
                          : '#F3F4F6',
                        color: isLinked ? 'white' : 'var(--color-text-secondary)',
                      }}
                    >
                      {counter.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-dark)' }}
                      >
                        {counter.name}
                      </p>
                      {!counter.isActive && (
                        <p
                          className="text-xs"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          Guichet inactif
                        </p>
                      )}
                    </div>
                    {assigningId === counter.id ? (
                      <RefreshCw
                        size={16}
                        className="animate-spin shrink-0"
                        style={{ color: 'var(--color-primary)' }}
                      />
                    ) : isLinked ? (
                      <Link2
                        size={16}
                        className="shrink-0"
                        style={{ color: 'var(--color-primary)' }}
                      />
                    ) : (
                      <Link2Off
                        size={16}
                        className="shrink-0"
                        style={{ color: '#D1D5DB' }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setCountersModalOpen(false)}
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              <X size={14} className="mr-2" />
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}