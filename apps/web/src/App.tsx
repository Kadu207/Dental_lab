import { useEffect, useId, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthGate } from "./components/AuthGate";
import { LicenseBanner } from "./components/LicenseBanner";
import { PermissionGate } from "./components/PermissionGate";
import { SupervisorTenantSelector, useSupervisorTenants } from "./components/SupervisorTenantSelector";
import { SidebarNavItem } from "./components/ui/SidebarNavItem";
import {
  IconClose,
  IconDatabase,
  IconKey,
  IconLock,
  IconLogout,
  IconMenu,
  IconUpload,
  IconUsers,
} from "./components/ui/Icons";
import {
  canAccessSupervisorConsole,
  clearLabSession,
  getLabUser,
  getSupervisorTenantId,
  IS_EMBEDDED,
} from "./lib/auth";
import { canSeeMenu } from "./lib/permissions";
import { SessionProvider, useSession } from "./lib/SessionContext";
import LoginPage from "./pages/Login";
import EsqueciSenhaPage from "./pages/EsqueciSenha";
import RedefinirSenhaPage from "./pages/RedefinirSenha";
import { BrandLogo } from "./components/BrandLogo";
import Dashboard from "./pages/Dashboard";
import ClientesPage from "./pages/Clientes";
import PacienteFichaPage from "./pages/PacienteFicha";
import OdontogramaPage from "./pages/Odontograma";
import SemAcessoPage from "./pages/SemAcesso";
import FornecedoresPage from "./pages/Fornecedores";
import EstoquePage from "./pages/Estoque";
import ProtesesPage from "./pages/Proteses";
import ConfiguracaoPage from "./pages/Configuracao";
import ScannerPage from "./pages/Scanner";
import LaboratorioPage from "./pages/Laboratorio";
import SetoresPage from "./pages/Setores";
import RelatoriosPage from "./pages/Relatorios";
import ColaboradoresPage from "./pages/Colaboradores";
import EmpresaPage from "./pages/Empresa";
import GeradorLicencasPage from "./pages/GeradorLicencas";
import FinanceiroPage from "./pages/Financeiro";
import ProcedimentosPage from "./pages/Procedimentos";
import GruposPage from "./pages/Grupos";
import EtiquetasPage from "./pages/Etiquetas";
import SupervisorCadastroPage from "./pages/SupervisorCadastro";
import SupervisorTenantsPage from "./pages/SupervisorTenants";
import SupervisorBackupPage from "./pages/SupervisorBackup";
import SupervisorImportPage from "./pages/SupervisorImport";
import SupervisorLicencasPage from "./pages/SupervisorLicencas";
import SupervisorContaPage from "./pages/SupervisorConta";
import SupervisorIntegracoesPage from "./pages/SupervisorIntegracoes";

type NavItem = { to: string; label: string; resource: string; end?: boolean; standaloneOnly?: boolean };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Cadastro",
    items: [
      { to: "/empresa", label: "Empresa", resource: "empresa" },
      { to: "/pacientes", label: "Pacientes", resource: "clientes" },
      { to: "/odontograma", label: "Odontograma", resource: "odontograma" },
      { to: "/colaboradores", label: "Colaboradores", resource: "colaboradores", standaloneOnly: true },
      { to: "/fornecedores", label: "Fornecedores", resource: "fornecedores" },
    ],
  },
  {
    title: "Laboratório",
    items: [
      { to: "/proteses", label: "Próteses", resource: "proteses" },
      { to: "/etiquetas", label: "Etiquetas", resource: "proteses" },
      { to: "/setores", label: "Status da Produção", resource: "proteses" },
    ],
  },
  {
    title: "Gestão",
    items: [{ to: "/financeiro", label: "Financeiro", resource: "financeiro" }],
  },
  {
    title: "",
    items: [{ to: "/", label: "Dashboard", resource: "proteses", end: true }],
  },
];

function filterNavSections(permissoes: ReturnType<typeof useSession>["permissoes"], loading: boolean): NavSection[] {
  return NAV_SECTIONS.map((section) => {
    const items = section.items.filter((item) => {
      if (item.standaloneOnly && IS_EMBEDDED) return false;
      if (loading) return true;
      return canSeeMenu(permissoes, item.resource);
    });
    return { ...section, items };
  }).filter((section) => section.items.length > 0);
}

function AppShell() {
  const navigate = useNavigate();
  const { permissoes, loading, perfil, isPlatformUser } = useSession();
  const isSupervisor = canAccessSupervisorConsole(perfil, isPlatformUser);
  const { tenants: supervisorTenants } = useSupervisorTenants(isSupervisor);
  const sections = isSupervisor ? [] : filterNavSections(permissoes, loading);
  const user = getLabUser();
  const isAdmin = perfil === "admin";
  const supervisorTenantSelected = getSupervisorTenantId();
  const [navOpen, setNavOpen] = useState(false);
  const navId = useId();

  function closeNav() {
    setNavOpen(false);
  }

  function handleLogout() {
    clearLabSession();
    closeNav();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeNav();
    }
    function onResize() {
      if (window.matchMedia("(min-width: 769px)").matches) closeNav();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("nav-open", navOpen);
    return () => document.body.classList.remove("nav-open");
  }, [navOpen]);

  return (
    <div className={`layout${navOpen ? " nav-is-open" : ""}`}>
      <header className="topbar">
        <button
          type="button"
          className="topbar-menu-btn"
          aria-label={navOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={navOpen}
          aria-controls={navId}
          onClick={() => setNavOpen((o) => !o)}
        >
          {navOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
        <BrandLogo size={32} showText variant="light" className="topbar-brand" />
        {user ? <span className="topbar-user">{user.nome}</span> : null}
      </header>
      {navOpen ? <button type="button" className="nav-backdrop" aria-label="Fechar menu" onClick={closeNav} /> : null}
      <aside id={navId} className={`sidebar${navOpen ? " is-open" : ""}`}>
        <div className="sidebar-top">
          <BrandLogo size={40} showText variant="light" className="sidebar-brand" />
          {IS_EMBEDDED ? <div className="embedded-badge">Modo integrado · Excellence</div> : null}
          {user ? (
            <div className="sidebar-perfil">
              {user.nome}
              {perfil ? ` · ${perfil}` : ""}
            </div>
          ) : null}
          {isSupervisor ? (
            <SupervisorTenantSelector tenants={supervisorTenants} />
          ) : null}
        </div>
        <nav className="sidebar-nav">
          {isSupervisor ? (
            <div>
              <div className="nav-section">Suporte (MASTER)</div>
              <SidebarNavItem to="/supervisor/cadastro" icon={<IconUsers size={18} />} onClick={closeNav}>
                Cadastro de clientes
              </SidebarNavItem>
              <SidebarNavItem to="/supervisor/tenants" icon={<IconKey size={18} />} onClick={closeNav}>
                Gerador de licenças
              </SidebarNavItem>
              <SidebarNavItem to="/supervisor/backup" icon={<IconDatabase size={18} />} onClick={closeNav}>
                Backup de empresas
              </SidebarNavItem>
              <SidebarNavItem to="/supervisor/import" icon={<IconUpload size={18} />} onClick={closeNav}>
                Importação de banco
              </SidebarNavItem>
              <SidebarNavItem to="/supervisor/conta" icon={<IconLock size={18} />} onClick={closeNav}>
                Senha do supervisor
              </SidebarNavItem>
              <SidebarNavItem to="/supervisor/integracoes" icon={<IconUpload size={18} />} onClick={closeNav}>
                Integrações N8N
              </SidebarNavItem>
              {supervisorTenantSelected ? (
                <>
                  <div className="nav-section" style={{ marginTop: 12 }}>
                    Tenant #{supervisorTenantSelected}
                  </div>
                  {NAV_SECTIONS.flatMap((s) => s.items).map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.end}
                      onClick={closeNav}
                      className={({ isActive }) => (isActive ? "active" : "")}
                    >
                      {n.label}
                    </NavLink>
                  ))}
                </>
              ) : null}
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.title || "dashboard"}>
                {section.title ? <div className="nav-section">{section.title}</div> : null}
                {section.items.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    onClick={closeNav}
                    className={({ isActive }) => (isActive ? "active" : "")}
                  >
                    {n.label}
                  </NavLink>
                ))}
              </div>
            ))
          )}
          {isAdmin ? (
            <div>
              <div className="nav-section">Inova</div>
              <NavLink
                to="/admin/licencas"
                onClick={closeNav}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                Gerador de licenças
              </NavLink>
            </div>
          ) : null}
        </nav>
        {!IS_EMBEDDED ? (
          <div className="sidebar-footer">
            <button type="button" className="btn-logout" onClick={handleLogout}>
              <IconLogout size={16} />
              Sair
            </button>
          </div>
        ) : null}
      </aside>
      <main className="main">
        {!isSupervisor || supervisorTenantSelected ? <LicenseBanner /> : null}
        <Routes>
          <Route
            path="/"
            element={
              isSupervisor ? (
                <Navigate to="/supervisor/cadastro" replace />
              ) : (
                <PermissionGate resource="proteses">
                  <Dashboard />
                </PermissionGate>
              )
            }
          />
          <Route path="/supervisor/cadastro" element={<SupervisorCadastroPage />} />
          <Route path="/supervisor/tenants" element={<SupervisorTenantsPage />} />
          <Route path="/supervisor/backup" element={<SupervisorBackupPage />} />
          <Route path="/supervisor/import" element={<SupervisorImportPage />} />
          <Route path="/supervisor/licencas" element={<SupervisorLicencasPage />} />
          <Route path="/supervisor/conta" element={<SupervisorContaPage />} />
          <Route path="/supervisor/integracoes" element={<SupervisorIntegracoesPage />} />
          <Route
            path="/laboratorio"
            element={
              <PermissionGate resource="proteses">
                <LaboratorioPage />
              </PermissionGate>
            }
          />
          <Route
            path="/pacientes"
            element={
              <PermissionGate resource="clientes">
                <ClientesPage />
              </PermissionGate>
            }
          />
          <Route
            path="/pacientes/:id"
            element={
              <PermissionGate resource="clientes">
                <PacienteFichaPage />
              </PermissionGate>
            }
          />
          <Route path="/clientes" element={<Navigate to="/pacientes" replace />} />
          <Route
            path="/odontograma"
            element={
              <PermissionGate resource="odontograma">
                <OdontogramaPage />
              </PermissionGate>
            }
          />
          <Route path="/sem-acesso" element={<SemAcessoPage />} />
          <Route
            path="/fornecedores"
            element={
              <PermissionGate resource="fornecedores">
                <FornecedoresPage />
              </PermissionGate>
            }
          />
          <Route
            path="/estoque"
            element={
              <PermissionGate resource="estoque">
                <EstoquePage />
              </PermissionGate>
            }
          />
          <Route
            path="/proteses"
            element={
              <PermissionGate resource="proteses">
                <ProtesesPage />
              </PermissionGate>
            }
          />
          <Route
            path="/etiquetas"
            element={
              <PermissionGate resource="proteses">
                <EtiquetasPage />
              </PermissionGate>
            }
          />
          <Route
            path="/setores"
            element={
              <PermissionGate resource="proteses">
                <SetoresPage />
              </PermissionGate>
            }
          />
          <Route
            path="/empresa"
            element={
              <PermissionGate resource="empresa">
                <EmpresaPage />
              </PermissionGate>
            }
          />
          {!IS_EMBEDDED ? <Route path="/admin/licencas" element={<GeradorLicencasPage />} /> : null}
          <Route
            path="/financeiro"
            element={
              <PermissionGate resource="financeiro">
                <FinanceiroPage />
              </PermissionGate>
            }
          />
          <Route
            path="/procedimentos"
            element={
              <PermissionGate resource="procedimentos">
                <ProcedimentosPage />
              </PermissionGate>
            }
          />
          <Route
            path="/grupos"
            element={
              <PermissionGate resource="grupos">
                <GruposPage />
              </PermissionGate>
            }
          />
          <Route
            path="/relatorios"
            element={
              <PermissionGate resource="proteses">
                <RelatoriosPage />
              </PermissionGate>
            }
          />
          {!IS_EMBEDDED && !isSupervisor ? (
            <Route
              path="/colaboradores"
              element={
                <PermissionGate resource="colaboradores">
                  <ColaboradoresPage />
                </PermissionGate>
              }
            />
          ) : null}
          {!IS_EMBEDDED && isSupervisor && supervisorTenantSelected ? (
            <Route
              path="/colaboradores"
              element={
                <PermissionGate resource="colaboradores">
                  <ColaboradoresPage />
                </PermissionGate>
              }
            />
          ) : null}
          <Route
            path="/configuracao"
            element={
              <PermissionGate resource="config">
                <ConfiguracaoPage />
              </PermissionGate>
            }
          />
          <Route
            path="/scanner"
            element={
              <PermissionGate resource="proteses">
                <ScannerPage />
              </PermissionGate>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      <Route
        path="/*"
        element={
          <AuthGate>
            <SessionProvider>
              <AppShell />
            </SessionProvider>
          </AuthGate>
        }
      />
    </Routes>
  );
}
