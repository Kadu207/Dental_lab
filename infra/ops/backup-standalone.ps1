# Backup Postgres - stack standalone Dental Lab
#
# Uso:
#   pwsh ./infra/ops/backup-standalone.ps1
#   pwsh ./infra/ops/backup-standalone.ps1 -OutDir D:\Backups\DentalLab -RetentionDays 14
#
param(
  [string]$ComposeFile = "docker-compose.standalone.yml",
  [string]$OutDir = ".\backups",
  [int]$RetentionDays = 7,
  [string]$PostgresUser = "dental_lab",
  [string]$PostgresDb = "dental_lab"
)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $root $ComposeFile))) {
  $root = Get-Location
}

Set-Location $root
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $OutDir "lab-$ts.sql"

Write-Host "Backup Dental Lab -> $outFile"

docker compose -f $ComposeFile exec -T lab-postgres `
  pg_dump -U $PostgresUser $PostgresDb | Set-Content -Path $outFile -Encoding UTF8

if (-not (Test-Path $outFile) -or (Get-Item $outFile).Length -lt 100) {
  throw "Backup falhou ou arquivo vazio."
}

Write-Host "OK - $((Get-Item $outFile).Length) bytes"

if ($RetentionDays -gt 0) {
  $cutoff = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem $OutDir -Filter "lab-*.sql" | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    Write-Host "Removendo backup antigo: $($_.Name)"
    Remove-Item $_.FullName -Force
  }
}

Write-Host "Concluido."
