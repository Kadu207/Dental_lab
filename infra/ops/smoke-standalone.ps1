# Smoke test — stack standalone (lab-web :8080 + lab-api via proxy /api/)
#
# Uso:
#   docker compose -f docker-compose.standalone.yml up -d --build
#   pwsh ./infra/ops/smoke-standalone.ps1 -BaseUrl http://127.0.0.1:8080
#
param(
  [string]$BaseUrl = "http://127.0.0.1:9180",
  [string]$Usuario = "admin",
  [string]$Senha = "admin123"
)

$ErrorActionPreference = "Stop"

function Read-Body($path) {
  if (Test-Path $path) { return Get-Content $path -Raw -Encoding UTF8 }
  return ""
}

function Invoke-CurlJson {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers = @{},
    [string]$BodyFile = $null
  )
  $outFile = [System.IO.Path]::GetTempFileName()
  $hdrArgs = @()
  foreach ($k in $Headers.Keys) { $hdrArgs += @("-H", "$k`: $($Headers[$k])") }
  $args = @("-sS", "--max-time", "60", "-o", $outFile, "-w", "%{http_code}", "-X", $Method, $Url) + $hdrArgs
  if ($BodyFile) { $args += @("-H", "Content-Type: application/json", "--data-binary", "@$BodyFile") }
  $code = (& curl.exe @args).Trim()
  $body = Read-Body $outFile
  Remove-Item $outFile -ErrorAction SilentlyContinue
  return @{ Code = [int]$code; Body = $body }
}

$BaseUrl = $BaseUrl.TrimEnd("/")
$fail = 0

Write-Host "=== Smoke Lab Standalone ==="
Write-Host "Base: $BaseUrl"

# 1) Health
$h = Invoke-CurlJson -Method GET -Url "$BaseUrl/api/health"
Write-Host "[1] GET /api/health -> $($h.Code)"
if ($h.Code -ne 200) { $fail++ } else { Write-Host "    $($h.Body)" }

# 2) Auth status
$st = Invoke-CurlJson -Method GET -Url "$BaseUrl/api/auth/status"
Write-Host "[2] GET /api/auth/status -> $($st.Code)"
if ($st.Code -ne 200) { $fail++ }

# 3) Login
$loginBody = [System.IO.Path]::GetTempFileName()
@{
  usuario = $Usuario
  senha   = $Senha
} | ConvertTo-Json | Set-Content -Path $loginBody -Encoding UTF8
$login = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/auth/login" -BodyFile $loginBody
Remove-Item $loginBody -ErrorAction SilentlyContinue
Write-Host "[3] POST /api/auth/login -> $($login.Code)"
if ($login.Code -ne 200) {
  $fail++
  Write-Host "    $($login.Body)"
  throw "Login falhou - verifique stack e credenciais ($Usuario)."
}
$token = (ConvertFrom-Json $login.Body).token
$authHeaders = @{ Authorization = "Bearer $token" }

# 4) Me
$me = Invoke-CurlJson -Method GET -Url "$BaseUrl/api/auth/me" -Headers $authHeaders
Write-Host "[4] GET /api/auth/me -> $($me.Code)"
if ($me.Code -ne 200) { $fail++ }

# 5) Config lab
$cfgPut = [System.IO.Path]::GetTempFileName()
@{ nome = "Lab Smoke Test"; telefone = "(11) 99999-0000" } | ConvertTo-Json | Set-Content $cfgPut -Encoding UTF8
$cfg = Invoke-CurlJson -Method PUT -Url "$BaseUrl/api/config/lab" -Headers $authHeaders -BodyFile $cfgPut
Remove-Item $cfgPut -ErrorAction SilentlyContinue
Write-Host "[5] PUT /api/config/lab -> $($cfg.Code)"
if ($cfg.Code -ne 200) { $fail++ }

# 6) Cliente
$cliBody = [System.IO.Path]::GetTempFileName()
@{ nome = "Paciente Smoke"; telefone = "(11) 98888-7777" } | ConvertTo-Json | Set-Content $cliBody -Encoding UTF8
$cli = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/clientes" -Headers $authHeaders -BodyFile $cliBody
Remove-Item $cliBody -ErrorAction SilentlyContinue
Write-Host "[6] POST /api/clientes -> $($cli.Code)"
if ($cli.Code -ne 201) { $fail++ }
$clienteId = (ConvertFrom-Json $cli.Body).id

# 7) Prótese
$protBody = [System.IO.Path]::GetTempFileName()
@{
  pacienteId   = $clienteId
  dentistaNome = "Dr. Smoke"
  tipoProtese  = "Coroa teste"
  dataEntrada  = (Get-Date -Format "yyyy-MM-dd")
} | ConvertTo-Json | Set-Content $protBody -Encoding UTF8
$prot = Invoke-CurlJson -Method POST -Url "$BaseUrl/api/proteses" -Headers $authHeaders -BodyFile $protBody
Remove-Item $protBody -ErrorAction SilentlyContinue
Write-Host "[7] POST /api/proteses -> $($prot.Code)"
if ($prot.Code -ne 201) { $fail++ }
$proteseId = (ConvertFrom-Json $prot.Body).protese.id

# 8) Alertas estoque
$alert = Invoke-CurlJson -Method GET -Url "$BaseUrl/api/estoque/alertas" -Headers $authHeaders
Write-Host "[8] GET /api/estoque/alertas -> $($alert.Code)"
if ($alert.Code -ne 200) { $fail++ }

# 9) Impressão HTML
$imp = Invoke-CurlJson -Method GET -Url "$BaseUrl/api/proteses/$proteseId/imprimir" -Headers $authHeaders
Write-Host "[9] GET /api/proteses/:id/imprimir -> $($imp.Code)"
if ($imp.Code -ne 200) { $fail++ }
elseif ($imp.Body -notmatch "VIA 1") { Write-Host "    AVISO: HTML sem marcador VIA 1"; $fail++ }

# 10) KPIs dashboard
$kpis = Invoke-CurlJson -Method GET -Url "$BaseUrl/api/dashboard/kpis" -Headers $authHeaders
Write-Host "[10] GET /api/dashboard/kpis -> $($kpis.Code)"
if ($kpis.Code -ne 200) { $fail++ }

# 11) Etiqueta teste
$teste = Invoke-CurlJson -Method GET -Url "$BaseUrl/api/etiquetas/teste-impressao?tamanho=termica_100x50" -Headers $authHeaders
Write-Host "[11] GET /api/etiquetas/teste-impressao -> $($teste.Code)"
if ($teste.Code -ne 200) { $fail++ }

# 12) SPA raiz
if ($BaseUrl -match ":3333$") {
  Write-Host "[12] GET / (SPA) -> SKIP (teste direto na API; use porta do lab-web)"
} else {
  $spa = Invoke-CurlJson -Method GET -Url "$BaseUrl/"
  Write-Host "[12] GET / (SPA) -> $($spa.Code)"
  if ($spa.Code -ne 200) { $fail++ }
}

Write-Host ""
if ($fail -eq 0) {
  Write-Host "=== PASS ($fail falha(s)) ==="
  exit 0
}
Write-Host "=== FAIL ($fail falha(s)) ==="
exit 1
