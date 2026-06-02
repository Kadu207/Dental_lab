# Alinhamento Empresa + Licenciamento — Dental Lab vs Excellence

Referência: `Excellence_Dental/docs/dental-lab/PAGINAS-EMPRESA-E-LICENCIAMENTO.md`

## Arquitetura de papéis

| Papel | Onde opera | Função |
|-------|------------|--------|
| **Supervisor Inova (suporte)** | [Gerador de Licenças](https://licencas.inovatitech.com.br) | Gerar, renovar, revogar, Stripe, clientes comerciais |
| **Admin do laboratório** | Dental Lab → Empresa | Cadastro, logo, filiais, ativar chave |
| **Recepção** | Dental Lab → Empresa | Ler empresa + ativar chave (RBAC) |

O **Gerador completo** (equivalente a `GeradorLicencas.tsx` do ERP) fica no **License Server**, não duplicado no Lab standalone.

No Lab, `/admin/licencas` é gerador **local/dev** (cache `product_licenses`) — produção comercial usa o servidor central.

## Status de implementação (jun/2026)

### Empresa

| Item spec | Lab | Status |
|-----------|-----|--------|
| Formulário básico (razão, CNPJ, endereço…) | `Empresa.tsx` | OK |
| Unidades / filiais + licença por filial | `Empresa.tsx` + API | OK |
| Trial 30 dias matriz/filial | `trial.ts` | OK (spec ERP: 7d) |
| Logo upload GET/POST/DELETE | — | Pendente |
| Campos extras (IE, IM, whatsapp, redes…) | — | Pendente |
| ViaCEP no CEP | — | Pendente |
| `has_logo` no GET | — | Pendente |

### Licenciamento tenant

| Item spec | Lab | Status |
|-----------|-----|--------|
| `LicencaEmpresaSection` (25 chars, status) | `LicencaLabSection.tsx` | OK |
| `GET/POST /licencas/status`, `/ativar` | API | OK |
| Validação remota `product=lab` | `remote-client.ts` | OK |
| `unidade_id` por filial | API + UI | OK |
| Banner alertas expiração | `LicenseBanner.tsx` | OK |
| Bloqueio writes licença expirada | — | Pendente |

### Gerador / Supervisor

| Item spec | Lab | Status |
|-----------|-----|--------|
| Console Inova comercial | `licencas.inovatitech.com.br` | Produção (Stripe em config) |
| `POST /licencas/gerar` local | API admin | OK |
| UI Gerador no Lab | `GeradorLicencas.tsx` | Em implementação |
| Revogar / PATCH licença | — | Usar Gerador central |

### Deploy VPS

| Item | Status |
|------|--------|
| Gerador :8195 + nginx Excellence | OK |
| Dental Lab :9180 | Bloqueado: `.env` Postgres placeholder |
| `dentallab.inovatitech.com.br` | 502 até Lab subir |

## Próximas entregas (ordem)

1. VPS: `.env` real + volume Postgres Lab
2. UI Gerador local + link console Inova
3. Logo empresa (API + UI)
4. Campos empresa extras + ViaCEP
5. Middleware `license_write_guard`
6. Stripe finalizado no Gerador central
