import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { serviceService } from "../../services/serviceService";
import type { Service } from "../../@types/index";
import {
  Banknote,
  ClipboardList,
  CreditCard,
  Info,
  Landmark,
  Users,
} from "lucide-react";
import ActiveTicketBanner from "#components/ActiveTicketBanner";
import { useActiveTicket } from "#hooks/useActiveTicket";

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  C: <Banknote size={28} color="#4A9EE8" />,
  R: <ClipboardList size={28} color="#4A9EE8" />,
  REN: <Info size={28} color="#4A9EE8" />,
  CON: <Users size={28} color="#4A9EE8" />,
  CB: <CreditCard size={28} color="#4A9EE8" />,
  default: <Landmark size={28} color="#4A9EE8" />,
};

export default function ServiceSelection() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // AgencyId fixe pour le portail client — à adapter selon la config
  const AGENCY_ID = 1;

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await serviceService.getAll(AGENCY_ID);
        setServices(data.filter((s) => s.isActive));
      } catch {
        setError("Impossible de charger les services. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const {
  activeTicket,
  isCalled,
  calledCounter,
  clearActiveTicket
} = useActiveTicket();

  const handleSelectService = (service: Service) => {
    navigate(`/ticket/form/${service.id}`, { state: { service } });
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Header */}
      <header
        className="w-full px-6 py-4 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: "var(--color-dark)" }}
      >
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
              SCB Cameroun
            </p>
          </div>
        </div>

        <div
          className="text-xs px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: "rgba(74, 158, 232, 0.15)",
            color: "var(--color-primary)",
          }}
        >
          Prise de ticket en ligne
        </div>
      </header>

      {/* Banner ticket actif */}
      {activeTicket && (
        <ActiveTicketBanner
          ticketNumber={activeTicket.ticketNumber}
          serviceName={activeTicket.serviceName}
          estimatedWaitTime={activeTicket.estimatedWaitTime}
          isCalled={isCalled}
          calledCounter={calledCounter}
          ticketId={activeTicket.id}
          onDismiss={clearActiveTicket}
        />
      )}

      {/* Contenu */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Titre */}
        <div className="text-center mb-10">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ color: "var(--color-dark)" }}
          >
            Bienvenue chez SCB Cameroun
          </h1>
          <p style={{ color: "var(--color-text-secondary)" }}>
            Sélectionnez le service pour lequel vous souhaitez prendre un ticket
          </p>
        </div>

        {/* Étapes */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {["Choisir un service", "Vos informations", "Votre ticket"].map(
            (step, index) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        index === 0
                          ? "var(--color-primary)"
                          : "var(--color-neutral)",
                      color:
                        index === 0 ? "white" : "var(--color-text-secondary)",
                      border: index === 0 ? "none" : "1px solid #E5E7EB",
                    }}
                  >
                    {index + 1}
                  </div>
                  <span
                    className="text-xs hidden sm:block"
                    style={{
                      color:
                        index === 0
                          ? "var(--color-primary)"
                          : "var(--color-text-secondary)",
                      fontWeight: index === 0 ? 600 : 400,
                    }}
                  >
                    {step}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className="w-8 h-px mx-1"
                    style={{ backgroundColor: "#E5E7EB" }}
                  />
                )}
              </div>
            ),
          )}
        </div>

        {/* États */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
              style={{
                borderColor: "var(--color-primary)",
                borderTopColor: "transparent",
              }}
            />
            <p style={{ color: "var(--color-text-secondary)" }}>
              Chargement des services...
            </p>
          </div>
        )}

        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm text-center"
            style={{ backgroundColor: "#FEE2E2", color: "var(--color-danger)" }}
          >
            {error}
          </div>
        )}

        {/* Grille des services */}
        {!loading && !error && (
          <>
            {services.length === 0 ? (
              <div className="text-center py-20">
                <p
                  className="text-lg font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Aucun service disponible pour le moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleSelectService(service)}
                    className="group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all text-left cursor-pointer"
                    style={{
                      backgroundColor: "var(--color-white)",
                      borderColor: "#E5E7EB",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--color-primary)";
                      e.currentTarget.style.backgroundColor = "#EBF5FD";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.backgroundColor =
                        "var(--color-white)";
                    }}
                  >
                    {/* Icône */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: "var(--color-neutral)" }}
                    >
                      {SERVICE_ICONS[service.code] || SERVICE_ICONS.default}
                    </div>

                    {/* Infos */}
                    <div className="text-center">
                      <p
                        className="font-semibold text-sm"
                        style={{ color: "var(--color-dark)" }}
                      >
                        {service.name}
                      </p>
                      {service.description && (
                        <p
                          className="text-xs mt-1 leading-relaxed"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {service.description}
                        </p>
                      )}
                    </div>

                    {/* Badge code */}
                    <div
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        backgroundColor: "rgba(74, 158, 232, 0.1)",
                        color: "var(--color-primary)",
                      }}
                    >
                      {service.code}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6">
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          © 2026 Qora — SCB Cameroun. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
