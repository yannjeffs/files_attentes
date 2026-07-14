import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, User, Phone, Mail, CreditCard } from "lucide-react";
import { ticketService } from "../../services/ticketService";
import type { Service } from "../../@types";
import { AxiosError } from "axios";

export default function ClientForm() {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const location = useLocation();
  const service = location.state?.service as Service;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    accountNumber: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.firstName.trim()) newErrors.firstName = "Le prénom est requis.";
    if (!form.lastName.trim()) newErrors.lastName = "Le nom est requis.";
    if (!form.phone.trim()) newErrors.phone = "Le téléphone est requis.";
    else if (!/^\+?[0-9]{8,15}$/.test(form.phone.trim()))
      newErrors.phone = "Numéro de téléphone invalide.";
    return newErrors;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const ticket = await ticketService.create({
        serviceId: Number(serviceId),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
      });

      navigate(`/ticket/confirmation/${ticket.id}`, { state: { ticket } });
    } catch (err: unknown) {
      const message =
        err instanceof AxiosError ? err.response?.data?.message : undefined;

      setErrors({
        global: message || "Une erreur est survenue. Réessayez plus tard.",
      });
    } finally {
      setLoading(false);
    }
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
            <svg width="32" height="32" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="52" height="52" rx="14" fill="#378ADD"/>
              <circle cx="26" cy="24" r="10" stroke="white" stroke-width="2.5" fill="none"/>
              <circle cx="26" cy="24" r="4" fill="white"/>
              <line x1="33" y1="31" x2="40" y2="38" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="14" cy="38" r="2.5" fill="white" opacity="0.5"/>
              <circle cx="20" cy="38" r="2.5" fill="white" opacity="0.7"/>
              <circle cx="26" cy="38" r="2.5" fill="white"/>
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

      <main className="max-w-xl mx-auto px-4 py-10">
        {/* Étapes */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["Choisir un service", "Vos informations", "Votre ticket"].map(
            (step, index) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor:
                        index === 0
                          ? "var(--color-success)"
                          : index === 1
                            ? "var(--color-primary)"
                            : "var(--color-neutral)",
                      color:
                        index < 2 ? "white" : "var(--color-text-secondary)",
                      border: index === 2 ? "1px solid #E5E7EB" : "none",
                    }}
                  >
                    {index === 0 ? "✓" : index + 1}
                  </div>
                  <span
                    className="text-xs hidden sm:block"
                    style={{
                      color:
                        index === 1
                          ? "var(--color-primary)"
                          : index === 0
                            ? "var(--color-success)"
                            : "var(--color-text-secondary)",
                      fontWeight: index === 1 ? 600 : 400,
                    }}
                  >
                    {step}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className="w-8 h-px mx-1"
                    style={{
                      backgroundColor:
                        index === 0 ? "var(--color-success)" : "#E5E7EB",
                    }}
                  />
                )}
              </div>
            ),
          )}
        </div>

        {/* Carte service sélectionné */}
        {service && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 border"
            style={{
              backgroundColor: "rgba(74, 158, 232, 0.05)",
              borderColor: "rgba(74, 158, 232, 0.2)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: "var(--color-neutral)" }}
            >
              🏦
            </div>
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-dark)" }}
              >
                {service.name}
              </p>
              {service.description && (
                <p
                  className="text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {service.description}
                </p>
              )}
            </div>
            <button
              onClick={() => navigate("/")}
              className="ml-auto flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--color-primary)" }}
            >
              <ArrowLeft size={14} />
              Changer
            </button>
          </div>
        )}

        {/* Formulaire */}
        <div
          className="rounded-2xl p-6 sm:p-8 shadow-sm border"
          style={{
            backgroundColor: "var(--color-white)",
            borderColor: "#E5E7EB",
          }}
        >
          <h2
            className="text-lg font-bold mb-1"
            style={{ color: "var(--color-dark)" }}
          >
            Vos informations
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Ces informations nous permettent de vous identifier lors de votre
            passage.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text)" }}
                >
                  Prénom <span style={{ color: "var(--color-danger)" }}>*</span>
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-text-secondary)" }}
                  />
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Jean"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                    style={{
                      borderColor: errors.firstName
                        ? "var(--color-danger)"
                        : "#E5E7EB",
                      backgroundColor: "var(--color-bg)",
                      color: "var(--color-text)",
                    }}
                    onFocus={(e) =>
                      !errors.firstName &&
                      (e.target.style.borderColor = "var(--color-primary)")
                    }
                    onBlur={(e) =>
                      !errors.firstName &&
                      (e.target.style.borderColor = "#E5E7EB")
                    }
                  />
                </div>
                {errors.firstName && (
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-danger)" }}
                  >
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text)" }}
                >
                  Nom <span style={{ color: "var(--color-danger)" }}>*</span>
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: "var(--color-text-secondary)" }}
                  />
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Dupont"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                    style={{
                      borderColor: errors.lastName
                        ? "var(--color-danger)"
                        : "#E5E7EB",
                      backgroundColor: "var(--color-bg)",
                      color: "var(--color-text)",
                    }}
                    onFocus={(e) =>
                      !errors.lastName &&
                      (e.target.style.borderColor = "var(--color-primary)")
                    }
                    onBlur={(e) =>
                      !errors.lastName &&
                      (e.target.style.borderColor = "#E5E7EB")
                    }
                  />
                </div>
                {errors.lastName && (
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-danger)" }}
                  >
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Téléphone */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Téléphone WhatsApp{" "}
                <span style={{ color: "var(--color-danger)" }}>*</span>
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--color-text-secondary)" }}
                />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+237690000000"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{
                    borderColor: errors.phone
                      ? "var(--color-danger)"
                      : "#E5E7EB",
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-text)",
                  }}
                  onFocus={(e) =>
                    !errors.phone &&
                    (e.target.style.borderColor = "var(--color-primary)")
                  }
                  onBlur={(e) =>
                    !errors.phone && (e.target.style.borderColor = "#E5E7EB")
                  }
                />
              </div>
              {errors.phone ? (
                <p className="text-xs" style={{ color: "var(--color-danger)" }}>
                  {errors.phone}
                </p>
              ) : (
                <p
                  className="text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Votre ticket vous sera envoyé sur ce numéro WhatsApp.
                </p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Email{" "}
                <span
                  className="text-xs font-normal"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  (optionnel)
                </span>
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--color-text-secondary)" }}
                />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jean.dupont@email.com"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{
                    borderColor: "#E5E7EB",
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-text)",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--color-primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>
            </div>

            {/* Numéro de compte */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Numéro de compte{" "}
                <span
                  className="text-xs font-normal"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  (optionnel)
                </span>
              </label>
              <div className="relative">
                <CreditCard
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--color-text-secondary)" }}
                />
                <input
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={handleChange}
                  placeholder="SCB-XXXX-XXXX"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{
                    borderColor: "#E5E7EB",
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-text)",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--color-primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>
            </div>

            {/* Erreur globale */}
            {errors.global && (
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "#FEE2E2",
                  color: "var(--color-danger)",
                }}
              >
                {errors.global}
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border transition-all hover:opacity-80"
                style={{
                  borderColor: "#E5E7EB",
                  color: "var(--color-text-secondary)",
                  backgroundColor: "var(--color-white)",
                }}
              >
                <ArrowLeft size={16} />
                Retour
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-sm transition-all"
                style={{
                  backgroundColor: loading
                    ? "var(--color-primary-hover)"
                    : "var(--color-primary)",
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="white"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Génération du ticket...
                  </span>
                ) : (
                  "Prendre mon ticket →"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6">
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          © 2024 Qora — SCB Cameroun. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
