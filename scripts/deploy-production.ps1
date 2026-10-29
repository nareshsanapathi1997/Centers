# Deploy Centre Manager on Windows server (run from centermanager folder as Administrator if needed).
# Usage:  cd C:\code\centermanager
#         powershell -ExecutionPolicy Bypass -File scripts\deploy-production.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "==> Deploy from: $Root"

$envFile = Join-Path $Root '.env'
if (-not (Test-Path $envFile)) {
    throw ".env not found at $envFile"
}

$envText = Get-Content $envFile -Raw
if ($envText -match '(?m)^NEXT_PUBLIC_BASE_PATH=(?!(\s*$))(.+)\s*$') {
    $val = $Matches[2].Trim()
    if ($val -ne '') {
        Write-Host "WARN: NEXT_PUBLIC_BASE_PATH=$val — app is configured for site root (empty). Clear it unless using a sub-path proxy."
    }
}

if ($envText -notmatch '(?m)^NODE_ENV=production\s*$') {
    Write-Host 'WARN: NODE_ENV=production not set in .env - set for this session only.'
    $env:NODE_ENV = 'production'
} else {
    $env:NODE_ENV = 'production'
}

Write-Host '==> Stopping pm2 process (if running)...'
try {
    pm2 stop TIME-CENTER-MANAGER 2>$null | Out-Null
} catch {
    # first deploy
}

Write-Host '==> npm run build ...'
npm run build
if ($LASTEXITCODE -ne 0) {
    throw 'npm run build failed - fix errors above before restarting pm2.'
}

$manifestPath = Join-Path $Root '.next\routes-manifest.json'
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$built = ($manifest.basePath -replace '/+$', '')
if ($built -ne '') {
    throw "Build basePath is '$built' but expected site root. Set NEXT_PUBLIC_BASE_PATH= in .env and rebuild."
}

Write-Host '==> Starting pm2 (fresh start)...'
pm2 delete TIME-CENTER-MANAGER 2>$null | Out-Null
$env:NODE_ENV = 'production'
pm2 start server.js --name TIME-CENTER-MANAGER --cwd $Root
if ($LASTEXITCODE -ne 0) {
    throw 'pm2 failed to start TIME-CENTER-MANAGER - check pm2 logs.'
}
pm2 save

Write-Host '==> Waiting for app on port 3600...'
Start-Sleep -Seconds 3

Write-Host '==> Verifying local build (site root)...'
try {
    $local = Invoke-WebRequest -Uri 'http://127.0.0.1:3600/admin/login' -UseBasicParsing -TimeoutSec 15
    if ($local.StatusCode -ne 200) {
        throw "Unexpected status $($local.StatusCode)"
    }
    Write-Host 'OK: app responds at http://127.0.0.1:3600/'
} catch {
    throw "Could not reach http://127.0.0.1:3600/admin/login — is port 3600 open? $($_.Exception.Message)"
}

Write-Host ''
Write-Host '==> Deploy OK. Proxy http://127.0.0.1:3600 at your public host root (or sub-path if you set NEXT_PUBLIC_BASE_PATH).'
Write-Host ''
