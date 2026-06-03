import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

type LoginShellProps = {
  children: ReactNode;
  logoSize?: number;
  wide?: boolean;
};

export function LoginShell({ children, logoSize = 64, wide }: LoginShellProps) {
  return (
    <div className={`login-page${wide ? " login-page-wide" : ""}`}>
      <div
        className="login-bg"
        style={{ backgroundImage: `url(${asset("login-bg.jpg")})` }}
        aria-hidden="true"
      />
      <div className="login-overlay" aria-hidden="true" />
      <div className={`login-panel${wide ? " login-panel-wide" : ""}`}>
        <BrandLogo size={logoSize} variant="dark" className="login-brand" />
        {children}
      </div>
    </div>
  );
}
