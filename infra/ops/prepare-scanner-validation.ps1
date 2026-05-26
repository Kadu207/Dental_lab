# Prepara código PROT-YYYYMMDD-TEST no banco para validar leitor após impressão de calibração
param(
  [string]$BaseUrl = "http://127.0.0.1:9180",
  [string]$Usuario = "admin",
  [string]$Senha = "admin123"
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")
$hoje = Get-Date -Format "yyyyMMdd"
$codigo = "PROT-$hoje-TEST"

function Invoke-Api($Method, $Path, $Body = $null, $Token = $null) {
  $hdr = @("-sS", "-X", $Method, "$BaseUrl$Path", "-H", "Content-Type: application/json")
  if ($Token) { $hdr += @("-H", "Authorization: Bearer $Token") }
  $tmp = $null
  if ($Body) {
    $tmp = [IO.Path]::GetTempFileName()
    $Body | ConvertTo-Json | Set-Content $tmp -Encoding UTF8
    $hdr += @("--data-binary", "@$tmp")
  }
  $out = curl.exe @hdr
  if ($tmp) { Remove-Item $tmp -ErrorAction SilentlyContinue }
  return $out
}

$loginRaw = Invoke-Api POST "/api/auth/login" @{ usuario = $Usuario; senha = $Senha }
$token = ($loginRaw | ConvertFrom-Json).token

$existing = Invoke-Api GET "/api/proteses/codigo/$codigo" $null $token
try {
  $parsed = $existing | ConvertFrom-Json
  if ($parsed.protese) {
    Write-Host "Ja existe: $codigo (paciente $($parsed.protese.paciente.nome))"
    Write-Host "Leitor: escaneie $codigo apos imprimir a etiqueta de teste."
    exit 0
  }
} catch { }

$cliRaw = Invoke-Api POST "/api/clientes" @{ nome = "Paciente Calibracao Impressora"; telefone = "(11) 97777-0000" } $token
$clienteId = ($cliRaw | ConvertFrom-Json).id

$protRaw = Invoke-Api POST "/api/proteses" @{
  pacienteId          = $clienteId
  dentistaNome        = "Dr. Calibracao ZD230"
  tipoProtese         = "Coroa teste 100x50"
  dentes              = "11, 21"
  dataEntrada         = (Get-Date -Format "yyyy-MM-dd")
  dataPrevistaEntrega = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
} $token
$protese = ($protRaw | ConvertFrom-Json).protese

Write-Host "Protese criada: $($protese.codigo)"
Write-Host "NOTA: codigo da protese real difere de $codigo (etiqueta HTML de teste)."
Write-Host "Para validar leitor com trabalho real, imprima 3 vias em Próteses -> $($protese.codigo)"
Write-Host "Ou escaneie $($protese.codigo) apos imprimir em Próteses."
