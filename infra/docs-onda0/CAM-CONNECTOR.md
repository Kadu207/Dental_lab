# CAM Connector — pasta do paciente, scanners 3D, impressoras e fresadoras

> Planejamento aprovado 2026-07-19. **Implementação Onda 4 (spec 010.1–010.3)** entregue — pasta + anexos + registry/hot folder. SDCP/agente = 010.4+. Sem build nesta fase.

## Objetivo de negócio

1. Cada **paciente** tem uma **pasta digital** (metadados no DB + arquivos no storage).
2. **Scanners 3D** do mercado alimentam essa pasta (STL/PLY/OBJ ou via SDK/API).
3. A partir do scan, o lab **fabrica a peça** na **impressora 3D** (piloto: **Elegoo Mars 5 Ultra**) e/ou **fresadoras**, via registry de adapters/SDKs.

Não confundir com a página **Scanner** atual (leitor de **código de barras** USB).

## Pasta digital do paciente

| Camada | Conteúdo |
|--------|----------|
| DB | `paciente_pastas` (1:1 com `clientes`), `paciente_anexos` (tipo, mime, checksum, `storage_key`, `protese_id?`) |
| Storage | `/data/lab/{clinica_id}/pacientes/{paciente_id}/scans\|anexos\|jobs/{job_id}/` |

- Criação automática no `POST` de paciente.
- API prevista: `GET/POST /api/pacientes/:id/pasta/anexos`.
- Isolamento multi-tenant por `clinica_id`.
- Blobs grandes **não** ficam inline no Postgres/SQLite por padrão.

## Pipeline

```text
Scanner 3D → paciente_anexos (pasta) → prótese/peça → cam_jobs
  → CamAdapter (print | mill) → Elegoo Mars 5 Ultra | Fresadora
  → ack status → atualiza job / setor
```

## Registry `CamAdapter`

Contrato único (TypeScript) com `id`, `capabilities`, `sendJob`, `getStatus?`, `discover?`.

| Adapter | Capacidade | Disponibilidade |
|---------|------------|-----------------|
| `filesystem` | print, mill, ingest | Sempre (hot folder + `.done`/`.fail`) |
| `elegoo_link` / `elegoo_sdcp` | print + status | SDK Elegoo Link + SDCP (Mars 5 Ultra Wi‑Fi) — **piloto SDK** |
| `medit_open_api` | scan ingest | Medit Link Open API (parceria/OAuth) |
| `shining_open_platform` | scan ingest | Shining Open Platform / SDK (autorização) |
| `threeshape_unite` | scan ingest | 3Shape Web Service — exige parceria formal |
| fresadoras (Roland, Imes-Icore, vhf…) | mill | Em geral filesystem/CAM; SDK se o fabricante liberar |

**Nota:** não existe um SDK único para “todo o mercado”. O Lab **pluga todos os disponíveis** via registry; sem SDK → `filesystem`.

## Agente on-prem

`dental-lab-cam-agent` na LAN do laboratório:

- Autentica na API Lab (HTTPS)
- Executa adapters locais (Elegoo SDCP, pastas UNC, ChiTuBox)
- Sincroniza anexos da pasta do paciente e jobs

Necessário quando a VPS cloud não enxerga as máquinas Wi‑Fi/USB do lab.

## Fases de implementação (spec 010)

| Fase | Entrega |
|------|---------|
| 010.1 | `paciente_pastas` + `paciente_anexos` + UI pasta |
| 010.2 | Upload scan → pasta → vincular prótese |
| 010.3 | Registry + FilesystemAdapter + perfis Elegoo (pasta) e fresadora |
| 010.4 | Adapter Elegoo Link/SDCP no agente |
| 010.5 | Slots Medit / Shining / 3Shape (conforme liberação) |
| 010.6 | Eventos EDD (`cam_asset_imported`, `cam_job_*`) |

## Aceite do piloto

- Paciente novo → pasta DB + diretório storage
- Importar STL de scanner na pasta do paciente
- Job print perfil Elegoo Mars 5 Ultra
- Job mill perfil genérico + `.done`
- Tenant A não vê pasta/jobs do tenant B

## Referências externas (pesquisa)

- Elegoo Link SDK (GitHub ELEGOO-3D/elegoo-link) · protocolo SDCP (WebSocket)
- Medit Link Open API / App Box
- Shining3D Open Platform
- 3Shape Unite Web Service (parceria)
