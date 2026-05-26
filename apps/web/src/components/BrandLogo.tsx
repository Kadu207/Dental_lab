type BrandLogoProps = {
  size?: number;
  showText?: boolean;
  variant?: "light" | "dark";
  className?: string;
};

const base = import.meta.env.BASE_URL;

export function BrandLogo({ size = 48, showText = true, variant = "dark", className = "" }: BrandLogoProps) {
  const textClass = variant === "light" ? "brand-logo-text-light" : "brand-logo-text-dark";

  return (
    <div className={`brand-logo ${className}`}>
      <img
        src={`${base}logo.png`}
        alt="Dental Lab — Laboratório Odontológico"
        width={size}
        height={size}
        className="brand-logo-img"
      />
      {showText ? (
        <div className={textClass}>
          <strong>Dental Lab</strong>
          <span>Clínica & Laboratório</span>
        </div>
      ) : null}
    </div>
  );
}
