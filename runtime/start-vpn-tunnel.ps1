$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot 'backend\AttendanceRoutine.Api'
$proxyScript = Join-Path $PSScriptRoot 'local-tunnel-server.cjs'
$ngrokDomain = 'conclude-trouble-blissful.ngrok-free.dev'
$ngrokPath = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages", "$env:LOCALAPPDATA\ngrok" -Filter ngrok.exe -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName

if (-not $ngrokPath) {
    throw 'ngrok.exe was not found.'
}

function Test-LocalPort([int]$port) {
    return $null -ne (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

if (-not (Test-LocalPort 5187)) {
    Start-Process dotnet -WorkingDirectory $backendPath -ArgumentList 'run', '--no-build', '--urls', 'http://127.0.0.1:5187'
}

if (-not (Test-LocalPort 5173)) {
    Start-Process node -WorkingDirectory $projectRoot -ArgumentList $proxyScript
}

if (-not (Test-LocalPort 4040)) {
    Start-Process $ngrokPath -ArgumentList 'http', '127.0.0.1:5173', "--domain=$ngrokDomain", '--host-header=rewrite', '--log=stdout'
}