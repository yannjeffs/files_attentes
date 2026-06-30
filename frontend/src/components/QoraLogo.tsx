type Variant = "blue" | "teal" | "dark";

interface QoraLogoProps {
  variant?: Variant;
  size?: number;
  showText?: boolean;
  showTagline?: boolean;
}

const COLORS: Record<Variant, string> = {
  blue: "#378ADD",
  teal: "#1D9E75",
  dark: "#0C447C",
};

export default function QoraLogo({
  variant = "blue",
  size = 52,
  showText = true,
  showTagline = false,
}: QoraLogoProps) {
  const fill = COLORS[variant];
  const radius = size * 0.269; // rx="14" sur base 52

  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.27 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Qora logo"
      >
        <rect width="52" height="52" rx={radius} fill={fill} />
        <circle cx="26" cy="24" r="10" stroke="white" strokeWidth="2.5" fill="none" />
        <circle cx="26" cy="24" r="4" fill="white" />
        <line
          x1="33" y1="31" x2="40" y2="38"
          stroke="white" strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx="14" cy="38" r="2.5" fill="white" opacity="0.5" />
        <circle cx="20" cy="38" r="2.5" fill="white" opacity="0.7" />
        <circle cx="26" cy="38" r="2.5" fill="white" />
      </svg>

      {showText && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <span
            style={{
              fontSize: size * 0.62,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: "var(--color-text-primary, #111)",
            }}
          >
            Qora
          </span>
          {showTagline && (
            <span
              style={{
                fontSize: size * 0.21,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-text-tertiary, #888)",
              }}
            >
              Queue Management
            </span>
          )}
        </div>
      )}
    </div>
  );
}