$ErrorActionPreference = "Stop"
$frontend = Split-Path $PSScriptRoot -Parent
$repoRoot = Split-Path $frontend -Parent
$zipPath = Join-Path $repoRoot "frontend.zip"

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

# Compress-Archive uses backslash paths that break on Linux (Hostinger).
# tar -a produces a zip with forward-slash entries Linux can extract.
$excludeArgs = @(
  "--exclude=node_modules",
  "--exclude=.next",
  "--exclude=.env.local",
  "--exclude=.git"
)

Push-Location $frontend
try {
  & tar.exe @excludeArgs -a -c -f $zipPath *
  if ($LASTEXITCODE -ne 0) {
    Write-Error "tar failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

$sizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "Created $zipPath ($sizeMb MB)"
