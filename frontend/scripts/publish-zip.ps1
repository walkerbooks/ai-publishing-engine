$ErrorActionPreference = "Stop"
$frontend = Split-Path $PSScriptRoot -Parent
$repoRoot = Split-Path $frontend -Parent
$zipPath = Join-Path $repoRoot "frontend.zip"
Set-Location $frontend
if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}
$exclude = @("node_modules", ".next", ".env.local")
$items = Get-ChildItem -Force | Where-Object { $_.Name -notin $exclude }
if (-not $items) {
  Write-Error "No files to zip in $frontend"
  exit 1
}
Compress-Archive -Path ($items | ForEach-Object { $_.FullName }) -DestinationPath $zipPath -CompressionLevel Optimal -Force
$sizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "Created $zipPath ($sizeMb MB)"
