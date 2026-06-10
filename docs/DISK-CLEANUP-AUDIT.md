# Auditoria e limpeza de disco — Dental Lab (VPS e PC)

Scripts **somente** para `/opt/dental-lab-system`. Não audita Excellence.

Excellence (outro repo): `cd /opt/excellence/repo && bash infra/ops/audit-disk-safe.sh`

## VPS

```bash
cd /opt/dental-lab-system
git pull origin master
chmod +x infra/ops/audit-disk-lab-vps.sh infra/ops/cleanup-disk-lab-vps.sh
bash infra/ops/audit-disk-lab-vps.sh
```

SCP do PC (use IP — `inovati-server` pode não resolver no Windows):

```powershell
$ops = "C:\Users\Carlos\OneDrive\Área de Trabalho\Projetos DEV\dental-lab-system\infra\ops"
scp "$ops\audit-disk-lab-vps.sh" "$ops\cleanup-disk-lab-vps.sh" gestaoti@128.140.77.31:/opt/dental-lab-system/infra/ops/
```

Limpeza: `bash infra/ops/cleanup-disk-lab-vps.sh` → `APPLY=1 bash infra/ops/cleanup-disk-lab-vps.sh`
