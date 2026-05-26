import { useEffect, useState } from "react";
import { api, type EstoqueItem } from "../api";
import { CrudForm, Modal } from "../components";

const FIELDS = [
  { name: "codigo", label: "Código", required: true },
  { name: "descricao", label: "Descrição", required: true },
  { name: "categoria", label: "Categoria" },
  { name: "unidade", label: "Unidade (un, kg, g...)" },
  { name: "quantidade", label: "Quantidade", type: "number" },
  { name: "quantidadeMinima", label: "Estoque mínimo", type: "number" },
  { name: "precoUnitario", label: "Preço unitário (R$)", type: "number" },
  { name: "localizacao", label: "Localização" },
];

export default function EstoquePage() {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [alertas, setAlertas] = useState<EstoqueItem[]>([]);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "mov"; item?: EstoqueItem } | null>(null);

  const load = async () => {
    setItems(await api.estoque.list());
    setAlertas(await api.estoque.alertas());
  };
  useEffect(() => { load(); }, []);

  const save = async (data: Record<string, string>) => {
    const payload = {
      ...data,
      quantidade: Number(data.quantidade ?? 0),
      quantidadeMinima: Number(data.quantidadeMinima ?? 0),
      precoUnitario: data.precoUnitario ? Number(data.precoUnitario) : undefined,
    };
    if (modal?.mode === "edit" && modal.item) {
      await api.estoque.update(modal.item.id, payload);
    } else if (modal?.mode === "mov" && modal.item) {
      await api.estoque.movimentar(modal.item.id, Number(data.quantidade), data.tipo as "entrada" | "saida");
    } else {
      await api.estoque.create(payload);
    }
    setModal(null);
    load();
  };

  return (
    <>
      <div className="page-header">
        <h2>Matéria-prima / Estoque</h2>
        <button className="btn btn-primary" onClick={() => setModal({ mode: "create" })}>+ Novo Item</button>
      </div>
      {alertas.length > 0 && (
        <div className="alert alert-warning">
          ⚠️ {alertas.length} item(ns) abaixo do estoque mínimo: {alertas.map((a) => a.descricao).join(", ")}
        </div>
      )}
      <div className="card">
        <table>
          <thead>
            <tr><th>Código</th><th>Descrição</th><th>Categoria</th><th>Qtd</th><th>Mín.</th><th>Local</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} style={e.quantidade <= e.quantidadeMinima ? { background: "#fef3c733" } : undefined}>
                <td><code>{e.codigo}</code></td>
                <td>{e.descricao}</td>
                <td>{e.categoria}</td>
                <td>{e.quantidade} {e.unidade}</td>
                <td>{e.quantidadeMinima}</td>
                <td>{e.localizacao ?? "—"}</td>
                <td className="actions">
                  <button className="btn btn-outline" onClick={() => setModal({ mode: "mov", item: e })}>Movimentar</button>
                  <button className="btn btn-outline" onClick={() => setModal({ mode: "edit", item: e })}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal?.mode === "mov" && modal.item && (
        <Modal title={`Movimentar: ${modal.item.descricao}`} onClose={() => setModal(null)}>
          <CrudForm
            fields={[
              { name: "tipo", label: "Tipo (entrada ou saida)", required: true },
              { name: "quantidade", label: "Quantidade", type: "number", required: true },
            ]}
            onSubmit={save}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal && modal.mode !== "mov" && (
        <Modal title={modal.mode === "create" ? "Novo Item" : "Editar Item"} onClose={() => setModal(null)}>
          <CrudForm fields={FIELDS} initial={modal.item as unknown as Record<string, string>} onSubmit={save} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
