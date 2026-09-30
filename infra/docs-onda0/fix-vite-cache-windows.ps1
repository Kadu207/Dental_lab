# Garante pastas Vite gravaveis quando apps/web esta com integridade High (Windows).
# Rode apos npm install se npm run dev:web falhar com EPERM em .vite-temp:
#   powershell -ExecutionPolicy Bypass -File infra/docs-onda0/fix-vite-cache-windows.ps1

$ErrorActionPreference = "Stop"
$Root = "c:\Projetos DEV\dental-lab-system"
$Nm = Join-Path $Root "apps\web\node_modules"
$Temp = Join-Path $Nm ".vite-temp"
$Cache = Join-Path $Nm ".vite"
$AltTemp = Join-Path $Root "infra\.vite-temp-web"
$AltCache = Join-Path $Root "infra\.vite-cache-web"

New-Item -ItemType Directory -Force -Path $AltTemp, $AltCache | Out-Null

function Ensure-Junction($link, $target) {
  if (Test-Path $link) {
    $item = Get-Item $link -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      Write-Host "OK junction: $link"
      return
    }
    cmd /c "rmdir /s /q `"$link`" 2>nul" | Out-Null
  }
  cmd /c "mklink /J `"$link`" `"$target`"" | Out-Null
  if (-not (Test-Path $link)) { throw "Falha ao criar junction $link" }
  Write-Host "Criado: $link -> $target"
}

if (-not (Test-Path $Nm)) {
  Write-Host "node_modules ausente — rode npm install antes."
  exit 1
}

Ensure-Junction $Temp $AltTemp
Ensure-Junction $Cache $AltCache
Write-Host "Pronto. Tente: npm run dev:web"
