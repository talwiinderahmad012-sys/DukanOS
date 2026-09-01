<#
  start-postgresql.ps1
  --------------------
  Ensures the local PostgreSQL Windows service is running and configured to
  start automatically on boot. Run ONCE as Administrator (or let
  fix-auth-everything.ps1 invoke it). Safe to re-run any time.

  What it does:
    1. Locates the PostgreSQL service (postgresql-x64-*, etc.)
    2. Sets its startup type to "Automatic" (survives restarts)
    3. Starts the service; falls back to pg_ctl.exe if Start-Service fails
    4. Waits up to ~30s for port 5432 to be listening
#>

$ErrorActionPreference = 'Continue'
function Write-Status($m) { Write-Host "[PG] $m" -ForegroundColor Cyan }

# Self-elevate if not administrator (service control requires admin)
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Status "Not running as Administrator. Restarting elevated..."
  Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit 0
}

$svc = Get-Service -Name *postgres* -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $svc) {
  Write-Status "No PostgreSQL Windows service found."
  Write-Status "If you run PostgreSQL in Docker, start it with: docker compose up -d db"
  Write-Status "Otherwise install PostgreSQL 16 and re-run this script."
  exit 1
}

Write-Status "Found service '$($svc.ServiceName)' (status=$($svc.Status), startType=$($svc.StartType))"

try {
  Set-Service -Name $svc.ServiceName -StartupType Automatic -ErrorAction Stop
  Write-Status "Startup type set to Automatic (will start on boot)."
} catch {
  Write-Status "Could not set startup type: $_"
}

if ($svc.Status -eq 'Running') {
  Write-Status "Service already running."
} else {
  Write-Status "Starting PostgreSQL service..."
  try {
    Start-Service -Name $svc.ServiceName -ErrorAction Stop
  } catch {
    Write-Status "Start-Service failed: $($_.Exception.Message)"
    Write-Status "Falling back to pg_ctl.exe directly..."
    try {
      $img = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\$($svc.ServiceName)").ImagePath
      $pgctl = [regex]::Match($img, '"?([^"]*pg_ctl\.exe)"?').Groups[1].Value
      $dataDir = [regex]::Match($img, '-D\s+"?([^"\s]+)"?').Groups[1].Value
      if ($pgctl -and $dataDir) {
        & $pgctl -D $dataDir -l "$env:TEMP\pg_start.log" start
      } else {
        Write-Status "Could not parse pg_ctl path/data dir from: $img"
      }
    } catch {
      Write-Status "pg_ctl fallback failed: $_"
    }
  }
}

for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Seconds 2
  $tcp = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
  if ($tcp) {
    Write-Status "SUCCESS: PostgreSQL is LISTENING on 5432."
    exit 0
  }
}

Write-Status "PostgreSQL did not come up on port 5432 within the timeout."
Write-Status "Check the PostgreSQL log: $env:TEMP\pg_start.log and the data dir logs."
exit 1
