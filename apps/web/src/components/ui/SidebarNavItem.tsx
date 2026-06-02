import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type Props = {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  end?: boolean;
};

export function SidebarNavItem({ to, icon, children, end }: Props) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
      <span className="sidebar-link-icon" aria-hidden>
        {icon}
      </span>
      <span className="sidebar-link-label">{children}</span>
    </NavLink>
  );
}
