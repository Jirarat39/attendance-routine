$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot 'backend\AttendanceRoutine.Api'
$backendDll = Join-Path $backendPath 'bin\Debug\net8.0\AttendanceRoutine.Api.dll'
$proxyScript = Join-Path $PSScriptRoot 'local-tunnel-server.cjs'
$logDirectory = Join-Path $PSScriptRoot 'logs'
$backendOutputLog = Join-Path $logDirectory 'backend.out.log'
$backendErrorLog = Join-Path $logDirectory 'backend.err.log'
$proxyOutputLog = Join-Path $logDirectory 'proxy.out.log'
$proxyErrorLog = Join-Path $logDirectory 'proxy.err.log'
$ngrokOutputLog = Join-Path $logDirectory 'ngrok.out.log'
$ngrokErrorLog = Join-Path $logDirectory 'ngrok.err.log'
$ngrokDomain = 'conclude-trouble-blissful.ngrok-free.dev'
$ngrokPath = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages", "$env:LOCALAPPDATA\ngrok" -Filter ngrok.exe -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName

if (-not $ngrokPath) {
    throw 'ngrok.exe was not found.'
}
if (-not (Test-Path $backendDll)) {
    throw 'The compiled backend was not found. Run dotnet build before starting the tunnel.'
}

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Test-LocalPort([int]$port) {
    return $null -ne (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

if (-not (Test-LocalPort 5187)) {
    $backendArguments = "`"$backendDll`" --urls http://127.0.0.1:5187"
    Start-Process dotnet -WindowStyle Hidden -WorkingDirectory $backendPath -ArgumentList $backendArguments -RedirectStandardOutput $backendOutputLog -RedirectStandardError $backendErrorLog
}

if (-not (Test-LocalPort 5173)) {
    $proxyArguments = "`"$proxyScript`""
    Start-Process node -WindowStyle Hidden -WorkingDirectory $projectRoot -ArgumentList $proxyArguments -RedirectStandardOutput $proxyOutputLog -RedirectStandardError $proxyErrorLog
}

if (-not (Test-LocalPort 4040)) {
    $ngrokArguments = "http 127.0.0.1:5173 --domain=$ngrokDomain --host-header=rewrite --log=stdout"
    Start-Process $ngrokPath -WindowStyle Hidden -ArgumentList $ngrokArguments -RedirectStandardOutput $ngrokOutputLog -RedirectStandardError $ngrokErrorLog
}