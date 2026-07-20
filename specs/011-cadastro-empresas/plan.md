# Plan: 011 Cadastro empresas

## Approach

1. Estender `seed-tenant.ts` com `parseTenantUnidades` + `seedTenantUnidades`; passar no `createTenant`.
2. Supervisor UI: lista dinâmica de unidades no formulário de create; payload `unidades`.
3. Empresa.tsx: seção Logo reusando `api.config.getLab` / `saveLab`.
4. Mensagem pós-create + botão Licença (já seta tenant e vai a `/supervisor/tenants`).

## Out of scope

IE/IM/WhatsApp extras, Storage S3, ViaCEP na Empresa (já no supervisor).
