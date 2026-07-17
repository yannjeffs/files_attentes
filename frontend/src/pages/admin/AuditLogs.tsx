import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, AlertCircle, Search,
  ChevronLeft, ChevronRight, User,
  Calendar, Filter, Eye, X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle
} from '../../components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '../../components/ui/select';
import { useAuthStore } from '../../store/authStore';
import type { AuditLog, AuditLogResponse } from '../../@types';
import api from '../../services/api';

// ── Couleur selon le type d'action ────────────────────────────────
const getActionStyle = (action: string) => {
  if (action.includes('CREATED') || action.includes('REGISTERED'))
    return {
      bg: 'rgba(39,174,96,0.1)',
      color: 'var(--color-success)',
      label: action,
    };
  if (action.includes('CALLED') || action.includes('STARTED') ||
      action.includes('COMPLETED'))
    return {
      bg: 'rgba(74,158,232,0.1)',
      color: 'var(--color-primary)',
      label: action,
    };
  if (action.includes('CANCELLED') || action.includes('NOSHOW') ||
      action.includes('DELETED') || action.includes('DEACTIVATED'))
    return {
      bg: 'rgba(235,87,87,0.1)',
      color: 'var(--color-danger)',
      label: action,
    };
  if (action.includes('UPDATED') || action.includes('MODIFIED') ||
      action.includes('TRANSFERRED'))
    return {
      bg: 'rgba(242,153,74,0.1)',
      color: 'var(--color-warning)',
      label: action,
    };
  return {
    bg: 'rgba(107,114,128,0.1)',
    color: 'var(--color-text-secondary)',
    label: action,
  };
};

export default function AuditLogs() {
  const { user } = useAuthStore();

  const [response, setResponse] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtres
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Liste des types d'entités pour le filtre
  const [entityTypes, setEntityTypes] = useState<string[]>([]);

  // Modal détail d'un log
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  // ── Charger les logs ──────────────────────────────────────────
  const loadLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        agencyId: String(user.agencyId),
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (search) params.append('action', search);
      if (entityType && entityType !== 'all')
        params.append('entityType', entityType);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get<AuditLogResponse>(
        `/auditlogs?${params.toString()}`
      );
      setResponse(res.data);
    } catch {
      setError('Impossible de charger les logs d\'audit.');
    } finally {
      setLoading(false);
    }
  }, [page, search, entityType, dateFrom, dateTo, user]);

  // ── Charger les types d'entités ───────────────────────────────
  useEffect(() => {
    if (!user) return;
    api.get<string[]>(
      `/auditlogs/entity-types?agencyId=${user.agencyId}`
    ).then((res) => setEntityTypes(res.data))
     .catch(() => {});
  }, [user?.agencyId, user]);

  // ── Recharger quand les filtres changent ──────────────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLogs();
  }, [loadLogs]);

  // ── Réinitialiser page quand filtres changent ─────────────────
  const handleFilterChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string
  ) => {
    setter(value);
    setPage(1);
  };

  // ── Formater la date ──────────────────────────────────────────
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  // ── Parser le JSON des valeurs ────────────────────────────────
  const parseJson = (json?: string) => {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return json;
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--color-dark)' }}
          >
            Audit Logs
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Historique complet des actions effectuées dans le système
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadLogs}
          className="flex items-center gap-2"
          style={{ borderColor: '#E5E7EB', color: 'var(--color-text-secondary)' }}
        >
          <RefreshCw size={14} />
          Actualiser
        </Button>
      </div>

      {/* Erreur */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
          style={{ backgroundColor: '#FEE2E2', color: 'var(--color-danger)' }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Filtres */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle
            className="text-sm font-semibold flex items-center gap-2"
            style={{ color: 'var(--color-dark)' }}
          >
            <Filter size={14} style={{ color: 'var(--color-primary)' }} />
            Filtres
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            {/* Recherche par action */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <input
                value={search}
                onChange={(e) =>
                  handleFilterChange(setSearch, e.target.value)
                }
                placeholder="Action (ex: TICKET_CALLED)"
                className="w-full pl-8 pr-3 py-2 rounded-xl border text-sm
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

            {/* Filtre par entité */}
            <Select
              value={entityType}
              onValueChange={(val) => handleFilterChange(setEntityType, val)}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Type d'entité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les entités</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date début */}
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) =>
                  handleFilterChange(setDateFrom, e.target.value)
                }
                className="w-full pl-8 pr-3 py-2 rounded-xl border text-sm
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

            {/* Date fin */}
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) =>
                  handleFilterChange(setDateTo, e.target.value)
                }
                className="w-full pl-8 pr-3 py-2 rounded-xl border text-sm
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

          {/* Réinitialiser filtres */}
          {(search || entityType || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearch('');
                setEntityType('');
                setDateFrom('');
                setDateTo('');
                setPage(1);
              }}
              className="mt-3 flex items-center gap-1 text-xs
                transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-danger)' }}
            >
              <X size={12} />
              Réinitialiser les filtres
            </button>
          )}
        </CardContent>
      </Card>

      {/* Tableau des logs */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw
                size={28}
                className="animate-spin"
                style={{ color: 'var(--color-primary)' }}
              />
            </div>
          ) : !response || response.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center
              py-16 gap-3">
              <AlertCircle
                size={36}
                style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }}
              />
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Aucun log trouvé pour ces critères.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--color-bg)',
                        borderBottom: '1px solid #E5E7EB',
                      }}
                    >
                      {['Date', 'Action', 'Entité', 'Utilisateur',
                        'IP', 'Détail'].map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs
                            font-semibold"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {response.items.map((log, index) => {
                      const style = getActionStyle(log.action);
                      return (
                        <tr
                          key={log.id}
                          style={{
                            borderBottom:
                              index < response.items.length - 1
                                ? '1px solid #F3F4F6'
                                : 'none',
                            backgroundColor:
                              index % 2 === 0
                                ? 'var(--color-white)'
                                : 'var(--color-bg)',
                          }}
                        >
                          {/* Date */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p
                              className="text-xs"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {formatDate(log.createdAt)}
                            </p>
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3">
                            <Badge
                              style={{
                                backgroundColor: style.bg,
                                color: style.color,
                                border: 'none',
                                fontSize: '11px',
                              }}
                            >
                              {log.action}
                            </Badge>
                          </td>

                          {/* Entité */}
                          <td className="px-4 py-3">
                            <div>
                              <p
                                className="text-xs font-medium"
                                style={{ color: 'var(--color-dark)' }}
                              >
                                {log.entityType}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: 'var(--color-text-secondary)' }}
                              >
                                #{log.entityId}
                              </p>
                            </div>
                          </td>

                          {/* Utilisateur */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex
                                  items-center justify-center"
                                style={{
                                  backgroundColor: 'rgba(74,158,232,0.1)',
                                }}
                              >
                                <User
                                  size={12}
                                  style={{ color: 'var(--color-primary)' }}
                                />
                              </div>
                              <div>
                                <p
                                  className="text-xs font-medium"
                                  style={{ color: 'var(--color-dark)' }}
                                >
                                  {log.userName}
                                </p>
                                {log.userRole && (
                                  <p
                                    className="text-xs"
                                    style={{ color: 'var(--color-text-secondary)' }}
                                  >
                                    {log.userRole}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* IP */}
                          <td className="px-4 py-3">
                            <p
                              className="text-xs font-mono"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {log.ipAddress ?? '—'}
                            </p>
                          </td>

                          {/* Bouton détail */}
                          <td className="px-4 py-3">
                            {(log.oldValues || log.newValues) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDetailLog(log)}
                                className="w-7 h-7"
                                title="Voir le détail"
                              >
                                <Eye
                                  size={14}
                                  style={{ color: 'var(--color-primary)' }}
                                />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                className="flex items-center justify-between px-4 py-3
                  border-t"
                style={{ borderColor: '#E5E7EB' }}
              >
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {response.totalCount} résultat(s) —
                  page {response.page} / {response.totalPages}
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
                      setPage((p) =>
                        Math.min(response.totalPages, p + 1)
                      )
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

      {/* ── MODAL DÉTAIL DU LOG ── */}
      <Dialog
        open={!!detailLog}
        onOpenChange={() => setDetailLog(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--color-dark)' }}>
              Détail du log #{detailLog?.id}
            </DialogTitle>
          </DialogHeader>

          {detailLog && (
            <div className="flex flex-col gap-4 py-2">
              {/* Infos générales */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p
                    className="text-xs font-medium mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Action
                  </p>
                  <Badge
                    style={{
                      backgroundColor:
                        getActionStyle(detailLog.action).bg,
                      color: getActionStyle(detailLog.action).color,
                      border: 'none',
                    }}
                  >
                    {detailLog.action}
                  </Badge>
                </div>
                <div>
                  <p
                    className="text-xs font-medium mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Entité
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-dark)' }}
                  >
                    {detailLog.entityType} #{detailLog.entityId}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-medium mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Utilisateur
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-dark)' }}
                  >
                    {detailLog.userName}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs font-medium mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Date
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-dark)' }}
                  >
                    {formatDate(detailLog.createdAt)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Anciennes valeurs */}
              {detailLog.oldValues && (
                <div>
                  <p
                    className="text-xs font-medium mb-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Valeurs avant modification
                  </p>
                  <pre
                    className="text-xs p-3 rounded-xl overflow-auto
                      max-h-40"
                    style={{
                      backgroundColor: 'rgba(235,87,87,0.06)',
                      color: 'var(--color-text)',
                      border: '1px solid rgba(235,87,87,0.2)',
                    }}
                  >
                    {JSON.stringify(
                      parseJson(detailLog.oldValues), null, 2
                    )}
                  </pre>
                </div>
              )}

              {/* Nouvelles valeurs */}
              {detailLog.newValues && (
                <div>
                  <p
                    className="text-xs font-medium mb-2"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Valeurs après modification
                  </p>
                  <pre
                    className="text-xs p-3 rounded-xl overflow-auto
                      max-h-40"
                    style={{
                      backgroundColor: 'rgba(39,174,96,0.06)',
                      color: 'var(--color-text)',
                      border: '1px solid rgba(39,174,96,0.2)',
                    }}
                  >
                    {JSON.stringify(
                      parseJson(detailLog.newValues), null, 2
                    )}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}