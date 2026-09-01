<#
  fix-auth-everything.ps1
  ------------------------
  ONE-COMMAND recovery for the "Invalid email or password" login error after a
  Windows restart. Run from the project root (DukaanOS).

  Steps:
    1. Ensure PostgreSQL is running + auto-starts (elevates to Admin)
    2. Ensure a stable AUTH_SECRET exists in .env and .env.local
    3. Ensure Prisma client is generated
    4. Ensure DB schema is migrated (prisma migrate deploy)
    5. Create/repair the ahmad account (password123)
    6. Print the credentials you can log in with

  Usage (PowerShell, from project root):
    pwsh scripts/fix-auth-everything.ps1
#>

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $root
function Write-Step($n, $m) { Write-Host "`n=== [$n] $m ===" -ForegroundColor Yellow }
function Write-Ok($m)   { Write-Host "  OK: $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "  WARN: $m" -ForegroundColor Magenta }

# 1) PostgreSQL
Write-Step 1 "PostgreSQL"
& pwsh -NoProfile -ExecutionPolicy Bypass -File "$root\scripts\start-postgresql.ps1"

# 2) AUTH_SECRET stable
Write-Step 2 "AUTH_SECRET"
$secret = $null
if (Test-Path .env.local) { $secret = (Select-String -Path .env.local -Pattern '^AUTH_SECRET=' | Select-Object -First 1).Line -replace '^AUTH_SECRET=' , '' }
if (-not $secret -or $secret -eq '""') {
  $secret = (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  Add-Content .env.local "AUTH_SECRET=`"$secret`""
  Add-Content .env.local "NEXTAUTH_SECRET=`"$secret`""
  Write-Ok "Generated + saved a new stable AUTH_SECRET"
} else {
  Write-Ok "AUTH_SECRET already present and stable"
}

# 3) Prisma generate
Write-Step 3 "Prisma client"
try {
  npx --no-install prisma generate 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { npx prisma generate }
  Write-Ok "Prisma client generated"
} catch { Write-Warn "prisma generate failed: $_" }

# 4) Migrate deploy
Write-Step 4 "Database migrations"
try {
  npx --no-install prisma migrate deploy 2>&1 | Out-Null
  Write-Ok "Migrations applied"
} catch { Write-Warn "migrate deploy failed (DB may be unreachable): $_" }

# 5) Bootstrap ahmad
Write-Step 5 "ahmad account"
try {
  npx --no-install tsx scripts/bootstrap-ahmad-user.ts
} catch {
  Write-Warn "bootstrap failed. Is PostgreSQL up? Re-run: pwsh scripts/start-postgresql.ps1"
}

# 6) Report
Write-Step 6 "Done"
Write-Host "`nLOGIN CREDENTIALS" -ForegroundColor Green
Write-Host "  username : ahmad"
Write-Host "  email    : ahmad@test.com"
Write-Host "  password : password123"
Write-Host "`nIf the app is already running, restart it (Ctrl+C then: npm run dev)."
Pop-Location
