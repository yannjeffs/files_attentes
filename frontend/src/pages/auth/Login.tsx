import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { authService } from "../../services/authResponse";
import type { User } from "../../@types/index";

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authService.login(form);

      const user: User = {
        id: 0,
        firstName: response.firstName,
        lastName: response.lastName,
        email: response.email,
        role: response.role as "Admin" | "Agent",
        agencyId: response.agencyId,
      };

      setAuth(user, response.token);

      // Redirection selon le rôle
      if (response.role === "Admin") navigate("/admin");
      else navigate("/agent");
      
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Panneau gauche — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12"
        style={{ backgroundColor: "var(--color-dark)" }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-6">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
              <circle cx="26" cy="22" r="12" stroke="white" strokeWidth="3" />
              <circle cx="26" cy="22" r="5" fill="white" />
              <circle cx="14" cy="38" r="3" fill="white" opacity="0.7" />
              <circle cx="26" cy="42" r="3" fill="white" opacity="0.9" />
              <circle cx="38" cy="38" r="3" fill="white" opacity="0.7" />
            </svg>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-white tracking-wide">
              Qora
            </h1>
            <p
              className="text-sm tracking-widest mt-1"
              style={{ color: "var(--color-primary)" }}
            >
              QUEUE MANAGEMENT
            </p>
          </div>

          <div className="mt-8 text-center max-w-xs">
            <p className="text-white/60 text-sm leading-relaxed">
              Gérez vos files d'attente intelligemment. Optimisez l'expérience
              client de votre agence SCB Cameroun.
            </p>
          </div>

          {/* Stats décoratifs */}
          <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-xs">
            {[
              { label: "Tickets/jour", value: "200+" },
              { label: "Agences", value: "10" },
              { label: "Satisfaction", value: "98%" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/50 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Header mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              <svg width="22" height="22" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="22" r="12" stroke="white" strokeWidth="3" />
                <circle cx="26" cy="22" r="5" fill="white" />
                <circle cx="14" cy="38" r="3" fill="white" opacity="0.7" />
                <circle cx="26" cy="42" r="3" fill="white" opacity="0.9" />
                <circle cx="38" cy="38" r="3" fill="white" opacity="0.7" />
              </svg>
            </div>
            <div>
              <p
                className="font-bold text-lg"
                style={{ color: "var(--color-dark)" }}
              >
                Qora
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Queue Management
              </p>
            </div>
          </div>

          {/* Titre */}
          <div className="mb-8">
            <h2
              className="text-2xl font-bold"
              style={{ color: "var(--color-dark)" }}
            >
              Connexion
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Accédez à votre espace de gestion
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="admin@qora.cm"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{
                  borderColor: "#E5E7EB",
                  backgroundColor: "var(--color-white)",
                  color: "var(--color-text)",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--color-primary)")
                }
                onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}
              >
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all pr-12"
                  style={{
                    borderColor: "#E5E7EB",
                    backgroundColor: "var(--color-white)",
                    color: "var(--color-text)",
                  }}
                  onFocus={(e) =>
                    (e.target.style.borderColor = "var(--color-primary)")
                  }
                  onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{
                  backgroundColor: "#FEE2E2",
                  color: "var(--color-danger)",
                }}
              >
                {error}
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all mt-2"
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
                  Connexion...
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            className="text-center text-xs mt-8"
            style={{ color: "var(--color-text-secondary)" }}
          >
            © 2024 Qora — SCB Cameroun. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}
