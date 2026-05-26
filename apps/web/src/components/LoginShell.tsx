import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";

const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

type LoginShellProps = {
  children: ReactNode;
  logoSize?: number;
};

export function LoginShell({ children, logoSize = 64 }: LoginShellProps) {
  return (
    <div className="login-page">
      <div
        className="login-bg"
        style={{ backgroundImage: `url(${asset("login-bg.jpg")})` }}
        aria-hidden="true"
      />
      <div className="login-overlay" aria-hidden="true" />
      <div className="login-panel">
        <BrandLogo size={logoSize} variant="dark" className="login-brand" />
        {children}
      </div>
    </div>
  );
}
