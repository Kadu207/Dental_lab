# Publica / revalida documentacao Onda 0 em docs/ (hard links - sem Admin).
# Uso:
#   cd "c:\Projetos DEV\dental-lab-system"
#   powershell -ExecutionPolicy Bypass -File infra\docs-onda0\publish-onda0.ps1

$ErrorActionPreference = "Stop"
$Root = "c:\Projetos DEV\dental-lab-system"
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  $Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
}
Set-Location $Root
$Src = Join-Path $Root "infra\docs-onda0"
$Docs = Join-Path $Root "docs"

$files = @(
  "ROADMAP-EVOLUCAO.md",
  "CAM-CONNECTOR.md",
  "INTEGRACOES-CHATWOOT-N8N.md"
)

Write-Host "==> Publicando docs via hard link (sem Admin)"
foreach ($f in $files) {
  $source = Join-Path $Src $f
  $dest = Join-Path $Docs $f
  if (-not (Test-Path $source)) { throw "Ausente: $source" }
  if (Test-Path $dest) {
    $item = Get-Item $dest
    if ($item.LinkType -eq "HardLink") {
      Write-Host "  OK (ja publicado): $f"
      continue
    }
    Remove-Item $dest -Force -ErrorAction SilentlyContinue
  }
  $null = cmd /c "mklink /H `"$dest`" `"$source`""
  if (-not (Test-Path $dest)) {
    Write-Host "  FALHA $f"
    Write-Host "  Se privilegio necessario: PowerShell Admin -> icacls docs /setintegritylevel M"
    exit 1
  }
  Write-Host "  OK: $f"
}

Write-Host ""
Write-Host "Onda 0 docs: pronta. Sem docker/npm build."
Write-Host "Proximo: diga aprovado - docs e depois codigo (Onda 1 = spec 006)."
Get-ChildItem $Docs | Where-Object { $files -contains $_.Name } | Format-Table Name, Length, LinkType -AutoSize
