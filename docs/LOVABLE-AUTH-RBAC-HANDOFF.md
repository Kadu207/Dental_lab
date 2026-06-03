# Handoff — Login, RBAC e recuperação de senha (Lovable)

Documento para recriar no [Lovable](https://lovable.dev) as telas de **autenticação** e integrar com a API já publicada na VPS.

Relacionado: `docs/LOVABLE-FRONTEND-HANDOFF.md` (console supervisor).

---

## 1. Escopo Lovable

| Tela | Rota | Função |
|------|------|--------|
| Login RBAC | `/login` | Usuário + senha, toggle mostrar senha, redirect por perfil |
| Esqueci senha | `/esqueci-senha` | Valida usuário+e-mail, dispara e-mail com link |
| Redefinir senha | `/redefinir-senha?token=...` | Nova senha + confirmar (token na URL ou state) |

**CRUD de usuários/RBAC (pós-login):** `/colaboradores` (tenant) e `/grupos` — não fazem parte do login, mas usam os mesmos perfis.

---

## 2. Design (alinhar ao supervisor)

- Fontes: **Outfit** (títulos), **DM Sans** (corpo)
- Card glass sobre fundo `login-bg.jpg` + overlay gradiente
- Botão primário com ícone (Lucide: `LogIn`, `Mail`, `Save`, `Eye`, `EyeOff`)
- Painel lateral **Perfis com RBAC** na tela de login (grid 2 colunas em desktop)
- Cores: roxo `#7c3aed`, primário `#0f172a`, muted `#64748b`

---

## 3. RBAC — perfis e redirect pós-login

| `perfil` | Label | Redirect após login |
|----------|-------|---------------------|
| `supervisor` | Supervisor | `/supervisor/cadastro` |
| `admin` | Administrador | `/` |
| `gestor` | Gestor | `/` |
| `recepcao` | Recepção | `/` |
| `laboratorio` | Laboratório | `/` |
| `colaborador` | Colaborador | `/` |
| `estagiario` | Estagiário | `/` |

O menu interno filtra módulos por `permissoes` retornadas em `GET /api/auth/me` (recurso + ações `read`/`write`/`delete`).

**Hierarquia (gestão de colaboradores):** supervisor > admin > gestor > recepção/colaborador > laboratório > estagiário.

---

## 4. API — autenticação

Base: `/api` (produção: `https://dentallab.inovatitech.com.br/api`).

### Login

```http
POST /api/auth/login
Content-Type: application/json

{ "usuario": "admin", "senha": "********", "clinicaId": 1 }
```

Resposta 200:

```json
{
  "token": "eyJ...",
  "nome": "admin",
  "perfil": "admin",
  "clinicaId": 1,
  "expiresInMinutes": 480,
  "isPlatformUser": false
}
```

Supervisor (platform):

```json
{ "perfil": "supervisor", "clinicaId": 0, "isPlatformUser": true }
```

Erro 401: `{ "erro": "Credenciais inválidas", "code": "INVALID_CREDENTIALS" }`

### Sessão

Guardar em `localStorage`:

| Chave | Valor |
|-------|--------|
| `lab_token` | JWT |
| `lab_clinica_id` | `clinicaId` |
| `lab_user` | JSON `{ nome, perfil }` |
| `lab_platform_user` | `"1"` se supervisor |

Headers nas requests autenticadas:

```
Authorization: Bearer <token>
X-Clinica-Id: <clinicaId>   // supervisor com tenant selecionado usa tenant id
```

### Me (permissões)

```http
GET /api/auth/me
Authorization: Bearer <token>
```

```json
{
  "sub": "admin",
  "perfil": "admin",
  "clinicaId": 1,
  "permissoes": [{ "resource": "*", "actions": ["read", "write", "delete"] }]
}
```

### Lista de perfis (pública)

```http
GET /api/auth/perfis
```

---

## 5. Recuperação de senha por e-mail

### Fluxo

1. Usuário informa **usuário** + **e-mail cadastrado** (`lab_usuarios.email` ou `platform_usuarios.email` para supervisor).
2. API valida e gera JWT de reset (15 min).
3. Se SMTP configurado → envia e-mail com link:
   `https://dentallab.inovatitech.com.br/redefinir-senha?token=<jwt>`
4. Usuário define nova senha → `POST /api/auth/recuperar-senha/redefinir`.

### Solicitar reset

```http
POST /api/auth/recuperar-senha/solicitar
{ "usuario": "admin", "email": "admin@dentallab.local", "clinicaId": 1 }
```

Resposta (SMTP OK — **não** expõe token):

```json
{
  "ok": true,
  "emailEnviado": true,
  "mensagem": "Se usuário e e-mail estiverem corretos, você receberá um link..."
}
```

Dev sem SMTP (`DENTAL_LAB_PASSWORD_RESET_EXPOSE_TOKEN=true`):

```json
{
  "ok": true,
  "resetToken": "...",
  "resetUrl": "https://.../redefinir-senha?token=...",
  "emailEnviado": false
}
```

### Redefinir

```http
POST /api/auth/recuperar-senha/redefinir
{ "token": "<jwt>", "novaSenha": "novaSenha123" }
```

### Status SMTP

```http
GET /api/auth/recuperar-senha/status
→ { "smtpConfigurado": true, "appUrl": "https://dentallab.inovatitech.com.br" }
```

---

## 6. Variáveis VPS (`.env`)

```env
DENTAL_LAB_APP_URL=https://dentallab.inovatitech.com.br
DENTAL_LAB_SMTP_ENABLED=true
DENTAL_LAB_SMTP_HOST=smtp.seudominio.com
DENTAL_LAB_SMTP_PORT=587
DENTAL_LAB_SMTP_USER=...
DENTAL_LAB_SMTP_PASS=...
DENTAL_LAB_SMTP_FROM=Dental Lab <noreply@dentallab.inovatitech.com.br>
DENTAL_LAB_PASSWORD_RESET_EXPOSE_TOKEN=false
```

**Importante:** cada colaborador precisa de **e-mail** em Colaboradores; supervisor usa e-mail em `platform_usuarios` (seed: `supervisor@inovatitech.local`).

---

## 7. Componentes no monorepo (referência)

| Arquivo | Uso |
|---------|-----|
| `apps/web/src/pages/Login.tsx` | Form + RBAC hints |
| `apps/web/src/pages/EsqueciSenha.tsx` | Solicitação + feedback e-mail |
| `apps/web/src/pages/RedefinirSenha.tsx` | Token via query `?token=` |
| `apps/web/src/components/auth/PasswordField.tsx` | Input senha + olho |
| `apps/web/src/lib/auth-routes.ts` | `getPostLoginPath(perfil)` |
| `apps/api/src/auth/rbac.ts` | Políticas e perfis |
| `apps/api/src/mail/mailer.ts` | Envio SMTP |

---

## 8. Prompt pronto para colar no Lovable

```
Crie o fluxo de autenticação Dental Lab (React + TypeScript + Tailwind):

1) /login — card glass, fundo escuro com imagem, logo no topo.
   Campos: usuário, senha com botão mostrar/ocultar (ícone olho).
   Link "Esqueceu a senha?" → /esqueci-senha.
   Botão "Entrar" com ícone.
   Ao lado (desktop): painel "Perfis com RBAC" listando Supervisor, Admin, Gestor, etc.
   POST /api/auth/login body { usuario, senha }.
   Salvar token em localStorage lab_token, lab_user, lab_clinica_id.
   Redirect: supervisor → /supervisor/cadastro; demais → /.

2) /esqueci-senha — usuário + e-mail, botão "Enviar link por e-mail".
   POST /api/auth/recuperar-senha/solicitar.
   Se emailEnviado: mensagem de sucesso. Nunca mostrar token em produção.

3) /redefinir-senha — ler token de ?token= na URL.
   Nova senha + confirmar, toggle mostrar senha.
   POST /api/auth/recuperar-senha/redefinir → redirect /login com mensagem de sucesso.

Design: Outfit + DM Sans, roxo #7c3aed, estilo premium Excellence Dental.
API base: /api (mesmo host).
```

---

## 9. Reintegração após Lovable

1. Copiar páginas geradas para `apps/web/src/pages/` (ou `components/`).
2. Manter chamadas `api.auth.*` de `apps/web/src/api.ts` ou adaptar fetch.
3. `npm run build -w @dental/web`
4. Na VPS: `bash infra/ops/redeploy-vps.sh`
5. Testar login, esqueci senha (com SMTP), redefinir via link do e-mail.

---

## 10. Checklist de testes

- [ ] Login admin → dashboard tenant
- [ ] Login supervisor → `/supervisor/cadastro`
- [ ] Toggle mostrar/ocultar senha
- [ ] Esqueci senha com e-mail cadastrado → recebe link (SMTP)
- [ ] Link expira em 15 min
- [ ] Redefinir senha e login com nova senha
- [ ] Colaborador sem e-mail → mensagem genérica (sem vazar se existe usuário)
