import { useState } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

interface CrudFormProps {
  fields: {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
    full?: boolean;
    options?: { value: string; label: string }[];
  }[];
  initial?: Record<string, string>;
  onSubmit: (data: Record<string, string>) => void;
  onCancel: () => void;
}

export function CrudForm({
  fields,
  initial = {},
  onSubmit,
  onCancel,
  onChange,
}: CrudFormProps & { onChange?: (data: Record<string, string>) => void }) {
  const [data, setData] = useState<Record<string, string>>(initial);

  const patch = (next: Record<string, string>) => {
    setData(next);
    onChange?.(next);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
    >
      <div className="form-grid">
        {fields.map((f) => (
          <div key={f.name} className={`form-group${f.full ? " full" : ""}`}>
            <label>{f.label}</label>
            {f.type === "textarea" ? (
              <textarea
                rows={3}
                value={data[f.name] ?? ""}
                onChange={(e) => patch({ ...data, [f.name]: e.target.value })}
              />
            ) : f.type === "select" && f.options ? (
              <select
                required={f.required}
                value={data[f.name] ?? ""}
                onChange={(e) => patch({ ...data, [f.name]: e.target.value })}
              >
                <option value="">Selecione…</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type ?? "text"}
                required={f.required}
                value={data[f.name] ?? ""}
                onChange={(e) => patch({ ...data, [f.name]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary">
          Salvar
        </button>
      </div>
    </form>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{STATUS_MAP[status] ?? status}</span>;
}

const STATUS_MAP: Record<string, string> = {
  recebido: "Recebido",
  em_producao: "Em Produção",
  prova: "Prova",
  acabamento: "Acabamento",
  pronto: "Pronto",
  entregue: "Entregue",
};
