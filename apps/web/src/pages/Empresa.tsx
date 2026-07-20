import { useEffect, useState } from "react";
import { api, type EmpresaData, type EmpresaUnidade } from "../api";
import { CrudForm, Modal } from "../components";
import { LicencaLabSection } from "../components/LicencaLabSection";

/** Marcador de layout — redeploy deve conter esta string no bundle (grep empresa-save-bar). */
export const EMPRESA_FORM_LAYOUT_VERSION = "empresa-form-v2";

const EMPRESA_FIELDS = [
  { name: "razaoSocial", label: "Razão social", full: true },
  { name: "nomeFantasia", label: "Nome fantasia", full: true },
  { name: "cnpj", label: "CNPJ" },
  { name: "cpf", label: "CPF" },
  { name: "telefone", label: "Telefone" },
  { name: "celular", label: "Celular" },
  { name: "email", label: "E-mail", type: "email" },
  { name: "redeSocial", label: "Rede social" },
  { name: "cep", label: "CEP" },
  { name: "endereco", label: "Endereço", full: true },
  { name: "numero", label: "Número" },
  { name: "bairro", label: "Bairro" },
  { name: "cidade", label: "Cidade" },
  { name: "estado", label: "UF" },
  { name: "nomeResponsavel", label: "Responsável" },
  { name: "contatoResponsavel", label: "Contato responsável" },
];

const UNIDADE_FIELDS = [
  { name: "nome", label: "Nome da unidade", required: true, full: true },
  { name: "cep", label: "CEP" },
  { name: "endereco", label: "Endereço", full: true },
  { name: "numero", label: "Número" },
  { name: "bairro", label: "Bairro" },
  { name: "cidade", label: "Cidade" },
  { name: "estado", label: "UF" },
];

export default function EmpresaPage() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [unidades, setUnidades] = useState<EmpresaUnidade[]>([]);
  const [modalUnidade, setModalUnidade] = useState(false);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");

  const load = async () => {
    try {
      const emp = await api.empresa.get();
      setForm(
        Object.fromEntries(
          Object.entries(emp).map(([k, v]) => [k, v == null ? "" : String(v)]),
        ) as Record<string, string>,
      );
      setUnidades(await api.empresa.listUnidades());
      try {
        const cfg = await api.config.getLab();
        setLogoUrl(cfg.logoUrl ?? "");
      } catch {
        setLogoUrl("");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const salvar = async () => {
    setSaving(true);
    setErro("");
    try {
      await api.empresa.save(form as Partial<EmpresaData>);
      setMsg("Dados da empresa salvos. Período de teste de 30 dias iniciado na matriz (se ainda não existia).");
      setTimeout(() => setMsg(""), 5000);
      await load();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const addUnidade = async (data: Record<string, string>) => {
    await api.empresa.createUnidade(data);
    setModalUnidade(false);
    setUnidades(await api.empresa.listUnidades());
    setMsg("Unidade cadastrada com período de teste de 30 dias.");
    setTimeout(() => setMsg(""), 5000);
  };

  return (
    <div className="empresa-page" data-layout={EMPRESA_FORM_LAYOUT_VERSION}>
      <header className="empresa-page-title">
        <h2>Empresa</h2>
      </header>

      <p className="page-desc empresa-page-desc">
        Dados da matriz do laboratório em que você está logado. Para cadastrar uma <strong>nova empresa cliente</strong>{" "}
        (ambiente isolado), use <strong>Suporte MASTER → Cadastro de clientes</strong> (perfil supervisor).
        Matriz e filiais possuem licenças distintas; cada unidade pode ter 30 dias de teste.
      </p>

      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {erro ? <div className="alert alert-error">{erro}</div> : null}

      <section
        className="card empresa-matriz-card"
        style={{ maxWidth: 900 }}
        aria-labelledby="empresa-matriz-heading"
      >
        <h3 id="empresa-matriz-heading" className="empresa-section-title">
          Identificação — Matriz
        </h3>

        <form
          id="empresa-matriz-form"
          className="empresa-matriz-form"
          onSubmit={(e) => {
            e.preventDefault();
            void salvar();
          }}
        >
          <div className="empresa-matriz-fields form-grid">
            {EMPRESA_FIELDS.map((f) => (
              <div key={f.name} className={`form-group${f.full ? " full" : ""}`}>
                <label htmlFor={`empresa-${f.name}`}>{f.label}</label>
                <input
                  id={`empresa-${f.name}`}
                  type={f.type ?? "text"}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="empresa-save-bar" role="group" aria-label="Salvar cadastro da matriz">
            <p className="empresa-save-hint muted">
              Revise os dados acima e clique em salvar para gravar a matriz.
            </p>
            <button type="submit" className="btn btn-primary empresa-btn-salvar" disabled={saving}>
              {saving ? "Salvando…" : "Salvar cadastro"}
            </button>
          </div>
        </form>
      </section>

      <section className="card empresa-logo-card" style={{ maxWidth: 900 }}>
        <h3 className="empresa-section-title">Logo da empresa</h3>
        <p className="muted" style={{ fontSize: "0.9rem", marginTop: 0 }}>
          Mesmo logo usado em etiquetas e cabeçalhos (armazenado em Configuração do lab).
        </p>
        <div className="form-group">
          <label htmlFor="empresa-logo-file">Logo (PNG/JPG, máx. 2 MB)</label>
          <input
            id="empresa-logo-file"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                setErro("Logo máximo 2 MB");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                void (async () => {
                  try {
                    setErro("");
                    const cfg = await api.config.getLab();
                    await api.config.saveLab({ ...cfg, logoUrl: reader.result as string });
                    setLogoUrl(reader.result as string);
                    setMsg("Logo atualizado.");
                    setTimeout(() => setMsg(""), 4000);
                  } catch (err) {
                    setErro(err instanceof Error ? err.message : "Falha ao salvar logo");
                  }
                })();
              };
              reader.readAsDataURL(file);
            }}
          />
        </div>
        {logoUrl ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
            <img
              src={logoUrl}
              alt="Logo"
              style={{ width: 56, height: 56, objectFit: "contain", border: "1px solid #ddd", borderRadius: 4 }}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                void (async () => {
                  try {
                    const cfg = await api.config.getLab();
                    await api.config.saveLab({ ...cfg, logoUrl: "" });
                    setLogoUrl("");
                    setMsg("Logo removido.");
                    setTimeout(() => setMsg(""), 4000);
                  } catch (err) {
                    setErro(err instanceof Error ? err.message : "Falha ao remover logo");
                  }
                })();
              }}
            >
              Remover logo
            </button>
          </div>
        ) : (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Nenhum logo cadastrado.
          </p>
        )}
      </section>

      <section className="card license-card empresa-licenca-card" style={{ maxWidth: 900 }}>
        <h3 className="empresa-section-title">Licenciamento</h3>
        <LicencaLabSection heading="Matriz (sede)" />
      </section>

      <section className="card empresa-unidades-card">
        <div className="empresa-unidades-head">
          <h3 className="empresa-section-title">Unidades / filiais</h3>
          <button type="button" className="btn btn-outline" onClick={() => setModalUnidade(true)}>
            + Nova unidade
          </button>
        </div>
        {unidades.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Nenhuma filial cadastrada. Cada filial terá licença e teste de 30 dias independentes.
          </p>
        ) : (
          unidades.map((u) => (
            <div key={u.id} className="license-filial-block">
              <div className="license-filial-head">
                <div>
                  <strong>{u.nome}</strong>
                  <span className="license-filial-meta">
                    {[u.cidade, u.estado].filter(Boolean).join(" / ") || "—"}
                  </span>
                </div>
                <button
                  className="btn btn-danger"
                  type="button"
                  onClick={async () => {
                    if (!confirm("Excluir unidade?")) return;
                    await api.empresa.removeUnidade(u.id);
                    setUnidades(await api.empresa.listUnidades());
                  }}
                >
                  Excluir
                </button>
              </div>
              <LicencaLabSection unidadeId={u.id} unidadeNome={u.nome} />
            </div>
          ))
        )}
      </section>

      {modalUnidade ? (
        <Modal title="Nova unidade" onClose={() => setModalUnidade(false)}>
          <CrudForm fields={UNIDADE_FIELDS} onSubmit={addUnidade} onCancel={() => setModalUnidade(false)} />
        </Modal>
      ) : null}
    </div>
  );
}
