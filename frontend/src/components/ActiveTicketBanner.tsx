import { useNavigate } from 'react-router-dom';
import { Ticket, Clock, Bell, ChevronRight, X } from 'lucide-react';

interface Props {
  ticketNumber: string;
  serviceName: string;
  estimatedWaitTime?: number;
  isCalled: boolean;
  calledCounter: number | null;
  ticketId: number;
  onDismiss: () => void;
}

export default function ActiveTicketBanner({
  ticketNumber,
  serviceName,
  estimatedWaitTime,
  isCalled,
  calledCounter,
  ticketId,
  onDismiss,
}: Props) {
  const navigate = useNavigate();

  return (
    <div
      className="w-full px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-all"
      style={{
        backgroundColor: isCalled
          ? 'rgba(39, 174, 96, 0.12)'
          : 'rgba(74, 158, 232, 0.08)',
        borderBottom: `2px solid ${isCalled ? 'var(--color-success)' : 'var(--color-primary)'}`,
      }}
      onClick={() => navigate(`/ticket/confirmation/${ticketId}`)}
    >
      {/* Icône */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{
          backgroundColor: isCalled
            ? 'rgba(39, 174, 96, 0.15)'
            : 'rgba(74, 158, 232, 0.15)',
        }}
      >
        {isCalled ? (
          <Bell size={20} color="var(--color-success)" />
        ) : (
          <Ticket size={20} color="var(--color-primary)" />
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        {isCalled ? (
          <>
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--color-success)' }}
            >
              🔔 C'est votre tour ! — Guichet {calledCounter}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Ticket {ticketNumber} — {serviceName} — Présentez-vous au guichet
            </p>
          </>
        ) : (
          <>
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--color-primary)' }}
            >
              Ticket {ticketNumber} en attente
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              <span
                className="text-xs"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {serviceName}
              </span>
              {estimatedWaitTime !== undefined && (
                <span
                  className="flex items-center gap-1 text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <Clock size={11} />
                  ~{estimatedWaitTime} min
                </span>
              )}
            </div>

            {/* Barre de progression */}
            <div className="mt-2 relative">
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: '#E5E7EB' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    width: estimatedWaitTime
                      ? `${Math.max(10, 100 - (estimatedWaitTime / 30) * 100)}%`
                      : '20%',
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <ChevronRight
          size={18}
          style={{ color: 'var(--color-text-secondary)' }}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 rounded-lg hover:opacity-70 transition-opacity"
          style={{ color: 'var(--color-text-secondary)' }}
          title="Fermer"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}