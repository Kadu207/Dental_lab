# Gera HTML de calibração 100×50 e abre no navegador (requer stack rodando)
#
# Uso:
#   pwsh ./infra/ops/print-test.ps1 -BaseUrl http://127.0.0.1:9180
#
param(
  [string]$BaseUrl = "http://127.0.0.1:9180",
  [string]$Usuario = "admin",
  [string]$Senha = "admin123",
  [string]$Tamanho = "termica_100x50"
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")

$loginBody = @{ usuario = $Usuario; senha = $Senha } | ConvertTo-Json
$loginFile = [System.IO.Path]::GetTempFileName()
Set-Content $loginFile $loginBody -Encoding UTF8
$out = [System.IO.Path]::GetTempFileName()
$code = (& curl.exe -sS -o $out -w "%{http_code}" -X POST "$BaseUrl/api/auth/login" -H "Content-Type: application/json" --data-binary "@$loginFile").Trim()
Remove-Item $loginFile -ErrorAction SilentlyContinue
if ($code -ne "200") { throw "Login falhou ($code): $(Get-Content $out -Raw)" }
$token = (Get-Content $out -Raw | ConvertFrom-Json).token
Remove-Item $out -ErrorAction SilentlyContinue

$htmlOut = Join-Path $env:TEMP "dental-lab-print-test-$Tamanho.html"
$impCode = (& curl.exe -sS -o $htmlOut -w "%{http_code}" -H "Authorization: Bearer $token" "$BaseUrl/api/etiquetas/teste-impressao?tamanho=$Tamanho").Trim()
if ($impCode -ne "200") { throw "Impressão teste falhou ($impCode)" }

Write-Host "HTML salvo: $htmlOut"
Start-Process $htmlOut
Write-Host "No diálogo: impressora térmica, 100×50 mm, margem 0, escala 100%."
