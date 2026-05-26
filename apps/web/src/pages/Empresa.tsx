import { useEffect, useState } from "react";
import { api, type EmpresaData, type EmpresaUnidade } from "../api";
import { CrudForm, Modal } from "../components";
import { LicencaLabSection } from "../components/LicencaLabSection";

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

  const load = async () => {
    try {
      const emp = await api.empresa.get();
      setForm(
        Object.fromEntries(
          Object.entries(emp).map(([k, v]) => [k, v == null ? "" : String(v)]),
        ) as Record<string, string>,
      );
      setUnidades(await api.empresa.listUnidades());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const salvar = async () => {
    try {
      await api.empresa.save(form as Partial<EmpresaData>);
      setMsg("Dados da empresa salvos. Período de teste de 30 dias iniciado na matriz (se ainda não existia).");
      setTimeout(() => setMsg(""), 5000);
      await load();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
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
    <>
      <div className="page-header">
        <h2>Empresa</h2>
        <button className="btn btn-primary" onClick={salvar}>
          Salvar cadastro
        </button>
      </div>
      <p className="page-desc">
        Matriz e filiais possuem licenças distintas. Cada novo cadastro recebe 30 dias de teste; após a venda, insira
        a chave comercial validada online pelo Gerador de Licenças.
      </p>
      {msg && <div className="alert alert-success">{msg}</div>}
      {erro && <div className="alert alert-error">{erro}</div>}

      <div className="card" style={{ maxWidth: 900 }}>
        <h3 style={{ marginBottom: 12 }}>Identificação — Matriz</h3>
        <div className="form-grid">
          {EMPRESA_FIELDS.map((f) => (
            <div key={f.name} className={`form-group${f.full ? " full" : ""}`}>
              <label>{f.label}</label>
              <input
                type={f.type ?? "text"}
                value={form[f.name] ?? ""}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="card license-card" style={{ maxWidth: 900, marginTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Licenciamento</h3>
        <LicencaLabSection heading="Matriz (sede)" />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="page-header" style={{ marginBottom: 8 }}>
          <h3>Unidades / filiais</h3>
          <button className="btn btn-outline" onClick={() => setModalUnidade(true)}>
            + Nova unidade
          </button>
        </div>
        {unidades.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
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
      </div>

      {modalUnidade && (
        <Modal title="Nova unidade" onClose={() => setModalUnidade(false)}>
          <CrudForm fields={UNIDADE_FIELDS} onSubmit={addUnidade} onCancel={() => setModalUnidade(false)} />
        </Modal>
      )}
    </>
  );
}
