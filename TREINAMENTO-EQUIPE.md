# Treinamento — Dental Lab System

Guia rápido para a equipe (recepção, laboratório e gestão). Duração sugerida: **45–60 min**.

---

## 1. Acesso

| Modo | URL | Login inicial |
|------|-----|---------------|
| Standalone | http://127.0.0.1:9180 (ou `LAB_WEB_PORT`) | `admin` / `admin123` — **trocar na primeira sessão** |
| Integrado (ERP) | Excellence → menu **Laboratório** | Mesmo usuário do ERP |

**Colaboradores (standalone):** menu **Colaboradores** → criar usuários com perfil (Recepção, Laboratório, Gestor).

---

## 2. Fluxo diário (30 min prática)

### Recepção / clínica

1. **Clientes** — cadastrar paciente (nome, telefone, CPF).
2. **Próteses** → **Nova prótese** — selecionar paciente, dentista, tipo de trabalho, previsão de entrega.
3. Escolher **tamanho da etiqueta** (padrão 100×50 mm).
4. **Imprimir 3 vias** — colar via Lab, Clínica e Paciente.
5. Entregar amostra ao laboratório com etiqueta.

### Laboratório (bancada)

1. **Setores** — ver fila por gesso / cerâmica / acabamento / entrega.
2. Mover trabalho entre setores conforme avanço.
3. **Leitor de código de barras** — escanear `PROT-...` para avançar status (Recebido → Em produção → … → Entregue).
4. **Estoque** — registrar saída de insumos quando aplicável.

### Gestão

1. **Dashboard** — KPIs, atrasos, alertas de estoque.
2. **Relatórios** — exportar CSV (Excel) ou HTML/PDF por período.
3. **Configuração** — logo, dados do lab, tamanho padrão de etiqueta.

---

## 3. Impressora térmica 100×50 mm

1. Configurar driver Windows (Zebra ZD230): papel **100×50 mm**, margem **0**, escala **100%**.
2. No sistema: **Configuração → Imprimir etiqueta de teste**.
3. Validar checklist em [IMPRESSORA-ETIQUETAS.md](./IMPRESSORA-ETIQUETAS.md).
4. Escanear código de teste no **Leitor** antes de ir para produção real.

---

## 4. Integração com Excellence (opcional)

- Pacientes podem ser enviados do ERP: **Gestão → Pacientes → Sync Lab / Enviar ao lab**.
- Módulo Lab exige licença **Cloud + Lab** ativa.

---

## 5. Backup e recuperação

```powershell
# Backup manual (standalone)
pwsh ./infra/ops/backup-standalone.ps1

# Restaurar em ambiente de teste
pwsh ./infra/ops/restore-standalone.ps1 -BackupFile .\backups\lab-YYYYMMDD-HHMMSS.sql
```

Agendar backup diário: ver [PRODUCAO-CHECKLIST.md](./PRODUCAO-CHECKLIST.md) §3.

---

## 6. Checklist pós-treinamento

- [ ] Cada participante fez login com usuário próprio (não `admin`)
- [ ] Cadastrou 1 cliente + 1 prótese de teste
- [ ] Imprimiu etiqueta de teste ou real
- [ ] Escaneou código no leitor
- [ ] Gestor exportou 1 relatório CSV
- [ ] Senha admin padrão alterada ou usuário admin desativado

---

## Suporte

- Smoke automatizado: `pwsh ./infra/ops/smoke-standalone.ps1 -BaseUrl http://127.0.0.1:9180`
- Logs: `docker compose -f docker-compose.standalone.yml logs lab-api lab-web`
