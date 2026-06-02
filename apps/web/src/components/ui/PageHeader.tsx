import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, subtitle, icon, actions }: Props) {
  return (
    <header className="page-header-block">
      <div className="page-header-main">
        {icon ? <div className="page-header-icon">{icon}</div> : null}
        <div>
          <h2 className="page-title">{title}</h2>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
