param(
  [string]$ComposeFile = "docker-compose.standalone.yml",
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

if (-not (Test-Path $ComposeFile)) {
  throw "Arquivo de compose não encontrado: $ComposeFile"
}

if (-not (Test-Path $EnvFile)) {
  throw "Arquivo de env não encontrado: $EnvFile"
}

$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#")) { return }
  $parts = $line.Split("=", 2)
  if ($parts.Length -eq 2) {
    $envVars[$parts[0]] = $parts[1]
  }
}

$pgUser = if ($envVars.ContainsKey("LAB_POSTGRES_USER")) { $envVars["LAB_POSTGRES_USER"] } else { "dental_lab" }
$pgDb = if ($envVars.ContainsKey("LAB_POSTGRES_DB")) { $envVars["LAB_POSTGRES_DB"] } else { "dental_lab" }

Write-Host "==> Tenant smoke (clinica_id) em $pgDb@$pgUser"

$sqlPath = Join-Path $root "scripts\\tenant_clinica_smoke.sql"
Get-Content -Raw $sqlPath | docker compose -f $ComposeFile --env-file $EnvFile exec -T lab-postgres `
  psql -v ON_ERROR_STOP=1 -U $pgUser -d $pgDb

if ($LASTEXITCODE -ne 0) {
  throw "Tenant smoke falhou."
}

Write-Host "==> Tenant smoke finalizado com sucesso."
