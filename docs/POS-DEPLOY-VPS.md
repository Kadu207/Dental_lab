# Pós-deploy VPS — senhas, backup e próximos passos

Após o primeiro deploy em **https://dentallab.inovatitech.com.br**.

---

## 1. Trocar senhas (≈ 5 min)

### Supervisor

1. Acesse https://dentallab.inovatitech.com.br  
2. Login: `supervisor` / senha atual (default `supervisor123` se não alterou no `.env`)  
3. Menu **Alterar senha** ou `/supervisor/conta`  
4. Defina senha forte (mín. 6 caracteres)

### Admin do tenant (empresa #1)

1. Logout do supervisor → login `admin` / `admin123`  
2. **Cadastro → Colaboradores**  
3. Editar usuário **admin** → campo **Nova senha (opcional)**  
4. Salvar e testar login com a senha nova

> Crie outros colaboradores reais e, quando possível, desative ou restrinja o `admin` seed.

---

## 2. Backup automático Postgres

Backup **físico** (`pg_dump`) de todo o cluster — inclui `dental_lab`, `dental_lab_platform` e schemas `lab_tN`.

```bash
cd /opt/dental-lab-system
chmod +x infra/ops/backup-postgres-vps.sh infra/ops/install-backup-cron-vps.sh

# Teste manual
bash infra/ops/backup-postgres-vps.sh
ls -lh /var/backups/dental-lab/postgres/

# Cron diário 03:15 (servidor)
bash infra/ops/install-backup-cron-vps.sh
```

Restore (somente teste/emergência):

```bash
bash infra/ops/restore-postgres-vps.sh /var/backups/dental-lab/postgres/lab-pg-YYYYMMDD-HHMMSS.sql.gz
```

Backup **lógico por tenant** (JSON): UI supervisor → Exportar, ou `infra/ops/backup-tenant-vps.sh`.

---

## 3. Rotacionar secrets (quando fizer sentido)

| Secret | Quando rotacionar |
|--------|-------------------|
| Senhas UI (admin/supervisor) | **Agora** (defaults públicos) |
| `DENTAL_LAB_LICENSE_SERVER_API_KEY` | Se vazou em log/chat — atualize Gerador **e** Lab juntos |
| `DENTAL_LAB_JWT_SECRET` | Fora do horário de pico — desloga todos |
| `LAB_POSTGRES_PASSWORD` | Só com plano de recriar volume Postgres |

---

## 4. Próximo deploy

```bash
cd /opt/dental-lab-system
bash infra/ops/redeploy-vps.sh
```

Não use `sudo docker compose` dentro de `/opt/dental-lab-system`.

---

## 5. Features entregues / roadmap

| Spec | Status |
|------|--------|
| 005 multi-tenant supervisor | Concluída |
| 004 paginação API + UI | API + UI pacientes/próteses |
| 002 módulos WIP UI | Concluída |
| 001 estabilização segurança | Concluída |

Próximas ideias: integração Excellence embedded, paginação em mais listagens, alertas de backup falho.
