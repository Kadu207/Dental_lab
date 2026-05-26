import { useEffect, useState } from "react";
import { api } from "../api";

export function LicenseBanner() {
  const [info, setInfo] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      api.licencas.status().then((data) => {
        if (mounted) setInfo(data);
      }).catch(() => {
        if (mounted) setInfo(null);
      });
    load();
    const t = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const level = String(info?.alertLevel ?? "none");
  if (!info || level === "none") return null;

  const tone =
    level === "expired"
      ? "alert-error"
      : level === "critical" || level === "warning"
        ? "alert-error"
        : "alert-success";

  return (
    <div className={`alert ${tone}`} style={{ marginBottom: 16 }}>
      <strong>{level === "expired" ? "Licença expirada" : "Aviso de licença"}</strong>
      <div>{String(info.alertMessage ?? "")}</div>
      <div style={{ fontSize: "0.85rem", marginTop: 6 }}>
        Contate suporte/comercial Excellence Dental para renovar ou cancelar.
      </div>
    </div>
  );
}
