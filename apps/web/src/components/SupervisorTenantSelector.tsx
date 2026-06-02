import { useEffect, useState } from "react";
import { api, type TenantRecord } from "../api";
import { getSupervisorTenantId, setSupervisorTenantId } from "../lib/auth";

interface Props {
  tenants: TenantRecord[];
  onChange?: (clinicaId: number | null) => void;
}

export function SupervisorTenantSelector({ tenants, onChange }: Props) {
  const [selected, setSelected] = useState<number | "">(getSupervisorTenantId() ?? "");

  useEffect(() => {
    const current = getSupervisorTenantId();
    if (current) setSelected(current);
  }, [tenants]);

  function handleChange(value: string) {
    if (!value) {
      setSelected("");
      setSupervisorTenantId(null);
      onChange?.(null);
      return;
    }
    const id = Number(value);
    setSelected(id);
    setSupervisorTenantId(id);
    onChange?.(id);
  }

  return (
    <div className="supervisor-tenant-select">
      <label htmlFor="supervisor-tenant">Tenant ativo</label>
      <select
        id="supervisor-tenant"
        value={selected === "" ? "" : String(selected)}
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="">— Selecione para operar o Lab —</option>
        {tenants
          .filter((t) => t.status === "active")
          .map((t) => (
            <option key={t.clinicaId} value={t.clinicaId}>
              #{t.clinicaId} · {t.nomeFantasia || t.razaoSocial || t.postgresSchema}
            </option>
          ))}
      </select>
    </div>
  );
}

export function useSupervisorTenants(enabled: boolean) {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [erro, setErro] = useState("");

  const refresh = () => {
    if (!enabled) return Promise.resolve();
    return api.supervisor
      .listTenants()
      .then(setTenants)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar tenants"));
  };

  useEffect(() => {
    if (!enabled) {
      setTenants([]);
      setLoading(false);
      return;
    }
    refresh().finally(() => setLoading(false));
  }, [enabled]);

  return { tenants, loading, erro, refresh, setErro };
}
