import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { AuthGate } from "./components/AuthGate";
import { LicenseBanner } from "./components/LicenseBanner";
import { IS_EMBEDDED, clearLabSession, getLabUser } from "./lib/auth";
import { canSeeMenu } from "./lib/permissions";
import { SessionProvider, useSession } from "./lib/SessionContext";
import LoginPage from "./pages/Login";
import EsqueciSenhaPage from "./pages/EsqueciSenha";
import RedefinirSenhaPage from "./pages/RedefinirSenha";
import { BrandLogo } from "./components/BrandLogo";
import Dashboard from "./pages/Dashboard";
import ClientesPage from "./pages/Clientes";
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
import FinanceiroPage from "./pages/Financeiro";
import ProcedimentosPage from "./pages/Procedimentos";
import GruposPage from "./pages/Grupos";
import EtiquetasPage from "./pages/Etiquetas";

type NavItem = { to: string; label: string; resource: string; end?: boolean; standaloneOnly?: boolean };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Cadastro",
    items: [
      { to: "/empresa", label: "Empresa", resource: "empresa" },
      { to: "/clientes", label: "Pacientes", resource: "clientes" },
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
  const sections = filterNavSections(permissoes, loading);
  const user = getLabUser();

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
        </div>
        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section.title || "dashboard"}>
              {section.title ? <div className="nav-section">{section.title}</div> : null}
              {section.items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : "")}>
                  {n.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        {!IS_EMBEDDED ? (
          <div className="sidebar-footer">
            <button type="button" className="btn-logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        ) : null}
      </aside>
      <main className="main">
        <LicenseBanner />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/laboratorio" element={<LaboratorioPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/fornecedores" element={<FornecedoresPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/proteses" element={<ProtesesPage />} />
          <Route path="/etiquetas" element={<EtiquetasPage />} />
          <Route path="/setores" element={<SetoresPage />} />
          <Route path="/empresa" element={<EmpresaPage />} />
          <Route path="/financeiro" element={<FinanceiroPage />} />
          <Route path="/procedimentos" element={<ProcedimentosPage />} />
          <Route path="/grupos" element={<GruposPage />} />
          <Route path="/relatorios" element={<RelatoriosPage />} />
          {!IS_EMBEDDED ? <Route path="/colaboradores" element={<ColaboradoresPage />} /> : null}
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
