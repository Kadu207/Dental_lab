import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { AuthGate } from "./components/AuthGate";
import { LicenseBanner } from "./components/LicenseBanner";
import { SupervisorTenantSelector, useSupervisorTenants } from "./components/SupervisorTenantSelector";
import { SidebarNavItem } from "./components/ui/SidebarNavItem";
import {
  IconDatabase,
  IconKey,
  IconLock,
  IconLogout,
  IconUpload,
  IconUsers,
} from "./components/ui/Icons";
import { IS_EMBEDDED, clearLabSession, getLabUser, getSupervisorTenantId, isPlatformUser } from "./lib/auth";
import { canSeeMenu } from "./lib/permissions";
import { SessionProvider, useSession } from "./lib/SessionContext";
import LoginPage from "./pages/Login";
import EsqueciSenhaPage from "./pages/EsqueciSenha";
import RedefinirSenhaPage from "./pages/RedefinirSenha";
import { BrandLogo } from "./components/BrandLogo";
import Dashboard from "./pages/Dashboard";
import ClientesPage from "./pages/Clientes";
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

type NavItem = { to: string; label: string; resource: string; end?: boolean; standaloneOnly?: boolean };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Cadastro",
    items: [
      { to: "/empresa", label: "Empresa", resource: "empresa" },
      { to: "/clientes", label: "Pacientes", resource: "clientes" },
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
  const { permissoes, loading, perfil } = useSession();
  const isSupervisor = perfil === "supervisor" || isPlatformUser();
  const { tenants: supervisorTenants } = useSupervisorTenants(isSupervisor);
  const sections = isSupervisor ? [] : filterNavSections(permissoes, loading);
  const user = getLabUser();
  const isAdmin = perfil === "admin";
  const supervisorTenantSelected = getSupervisorTenantId();

  function handleLogout() {
    clearLabSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="layout">
      <aside className="sidebar">
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
              <SidebarNavItem to="/supervisor/cadastro" icon={<IconUsers size={18} />}>
                Cadastro de clientes
              </SidebarNavItem>
              <SidebarNavItem to="/supervisor/tenants" icon={<IconKey size={18} />}>
                Gerador de licenças
              </SidebarNavItem>
              <SidebarNavItem to="/supervisor/backup" icon={<IconDatabase size={18} />}>
                Backup de empresas
              </SidebarNavItem>
              <SidebarNavItem to="/supervisor/import" icon={<IconUpload size={18} />}>
                Importação de banco
              </SidebarNavItem>
              <SidebarNavItem to="/supervisor/conta" icon={<IconLock size={18} />}>
                Senha do supervisor
              </SidebarNavItem>
              {supervisorTenantSelected ? (
                <>
                  <div className="nav-section" style={{ marginTop: 12 }}>
                    Tenant #{supervisorTenantSelected}
                  </div>
                  {NAV_SECTIONS.flatMap((s) => s.items).map((n) => (
                    <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : "")}>
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
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : "")}>
                    {n.label}
                  </NavLink>
                ))}
              </div>
            ))
          )}
          {isAdmin ? (
            <div>
              <div className="nav-section">Inova</div>
              <NavLink to="/admin/licencas" className={({ isActive }) => (isActive ? "active" : "")}>
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
            element={isSupervisor ? <Navigate to="/supervisor/cadastro" replace /> : <Dashboard />}
          />
          <Route path="/supervisor/cadastro" element={<SupervisorCadastroPage />} />
          <Route path="/supervisor/tenants" element={<SupervisorTenantsPage />} />
          <Route path="/supervisor/backup" element={<SupervisorBackupPage />} />
          <Route path="/supervisor/import" element={<SupervisorImportPage />} />
          <Route path="/supervisor/licencas" element={<SupervisorLicencasPage />} />
          <Route path="/supervisor/conta" element={<SupervisorContaPage />} />
          <Route path="/laboratorio" element={<LaboratorioPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/odontograma" element={<OdontogramaPage />} />
          <Route path="/sem-acesso" element={<SemAcessoPage />} />
          <Route path="/fornecedores" element={<FornecedoresPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/proteses" element={<ProtesesPage />} />
          <Route path="/etiquetas" element={<EtiquetasPage />} />
          <Route path="/setores" element={<SetoresPage />} />
          <Route path="/empresa" element={<EmpresaPage />} />
          {!IS_EMBEDDED ? <Route path="/admin/licencas" element={<GeradorLicencasPage />} /> : null}
          <Route path="/financeiro" element={<FinanceiroPage />} />
          <Route path="/procedimentos" element={<ProcedimentosPage />} />
          <Route path="/grupos" element={<GruposPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          {!IS_EMBEDDED && !isSupervisor ? <Route path="/colaboradores" element={<ColaboradoresPage />} /> : null}
          {!IS_EMBEDDED && isSupervisor && supervisorTenantSelected ? (
            <Route path="/colaboradores" element={<ColaboradoresPage />} />
          ) : null}
          <Route path="/configuracao" element={<ConfiguracaoPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
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
