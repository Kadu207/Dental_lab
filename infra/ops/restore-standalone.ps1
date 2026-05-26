# Restore Postgres — stack standalone Dental Lab
#
# Uso:
#   pwsh ./infra/ops/restore-standalone.ps1 -BackupFile .\backups\lab-20260521-120000.sql
#
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$ComposeFile = "docker-compose.standalone.yml",
  [string]$PostgresUser = "dental_lab",
  [string]$PostgresDb = "dental_lab"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $BackupFile)) {
  throw "Arquivo não encontrado: $BackupFile"
}

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $root $ComposeFile))) {
  $root = Get-Location
}
Set-Location $root

Write-Host "ATENÇÃO: isto sobrescreve o banco $PostgresDb. Confirme em ambiente de TESTE."
Write-Host "Restaurando $BackupFile ..."

Get-Content $BackupFile -Raw | docker compose -f $ComposeFile exec -T lab-postgres `
  psql -U $PostgresUser -d $PostgresDb

Write-Host "Restore concluído. Reinicie lab-api se necessário:"
Write-Host "  docker compose -f $ComposeFile restart lab-api"
