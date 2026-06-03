import { FormEvent } from "react";
import { applyMask, type MaskKind } from "../lib/inputMasks";
import type { Fornecedor } from "../api";

export type FornecedorFormData = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  contato: string;
  telefone: string;
  email: string;
  endereco: string;
  observacoes: string;
};

const EMPTY: FornecedorFormData = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  contato: "",
  telefone: "",
  email: "",
  endereco: "",
  observacoes: "",
};

export function fornecedorToForm(f?: Fornecedor | null): FornecedorFormData {
  if (!f) return { ...EMPTY };
  return {
    razaoSocial: f.razaoSocial ?? "",
    nomeFantasia: f.nomeFantasia ?? "",
    cnpj: f.cnpj ?? "",
    contato: f.contato ?? "",
    telefone: f.telefone ?? "",
    email: f.email ?? "",
    endereco: f.endereco ?? "",
    observacoes: f.observacoes ?? "",
  };
}

type FieldDef = {
  name: keyof FornecedorFormData;
  label: string;
  required?: boolean;
  full?: boolean;
  type?: string;
  mask?: MaskKind;
};

const SECOES: { titulo: string; campos: FieldDef[] }[] = [
  {
    titulo: "Identificação",
    campos: [
      { name: "razaoSocial", label: "Razão social", required: true, full: true },
      { name: "nomeFantasia", label: "Nome fantasia", full: true },
      { name: "cnpj", label: "CNPJ", mask: "cnpj" },
    ],
  },
  {
    titulo: "Contato",
    campos: [
      { name: "contato", label: "Nome do contato" },
      { name: "telefone", label: "Telefone", mask: "phone" },
      { name: "email", label: "E-mail", type: "email", full: true },
    ],
  },
  {
    titulo: "Endereço e observações",
    campos: [
      { name: "endereco", label: "Endereço completo", full: true },
      { name: "observacoes", label: "Observações", type: "textarea", full: true },
    ],
  },
];

type Props = {
  value: FornecedorFormData;
  onChange: (next: FornecedorFormData) => void;
  onSubmit: (data: FornecedorFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
};

export function FornecedorForm({ value, onChange, onSubmit, onCancel, submitLabel = "Salvar" }: Props) {
  const patch = (name: keyof FornecedorFormData, raw: string, mask?: MaskKind) => {
    onChange({ ...value, [name]: mask ? applyMask(mask, raw) : raw });
  };

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(value);
  }

  return (
    <form onSubmit={handleSubmit} className="fornecedor-form">
      {SECOES.map((sec) => (
        <fieldset key={sec.titulo} className="form-section">
          <legend className="form-section-title">{sec.titulo}</legend>
          <div className="form-grid">
            {sec.campos.map((f) => (
              <div key={f.name} className={`form-group${f.full ? " full" : ""}`}>
                <label htmlFor={`forn-${f.name}`}>
                  {f.label}
                  {f.required ? " *" : ""}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    id={`forn-${f.name}`}
                    rows={3}
                    value={value[f.name]}
                    onChange={(e) => patch(f.name, e.target.value)}
                  />
                ) : (
                  <input
                    id={`forn-${f.name}`}
                    type={f.type ?? "text"}
                    required={f.required}
                    value={value[f.name]}
                    onChange={(e) => patch(f.name, e.target.value, f.mask)}
                    placeholder={f.mask === "cnpj" ? "00.000.000/0000-00" : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
