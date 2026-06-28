$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$frontend = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $frontend "package.json"))) {
  Write-Error "Could not find frontend folder (package.json) above scripts/"
}

$src = Join-Path $frontend "public\walkerbook\Walkerbook logo with hiker path.png"
if (-not (Test-Path $src)) {
  Write-Error "Missing source: $src"
}

$img = [System.Drawing.Image]::FromFile($src)
try {
  $w = $img.Width
  $h = $img.Height
  Write-Host "Source dimensions: ${w}x${h}"

  $side = [Math]::Min($w, $h)
  $x = [int](($w - $side) / 2)
  $y = [int](($h - $side) / 2)
  $srcRect = New-Object System.Drawing.Rectangle @($x, $y, $side, $side)
  $square = $img.Clone($srcRect, $img.PixelFormat)

  $outSize = 512
  $newBmp = New-Object System.Drawing.Bitmap $outSize, $outSize
  $g = [System.Drawing.Graphics]::FromImage($newBmp)
  try {
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($square, 0, 0, $outSize, $outSize)
  } finally {
    $g.Dispose()
  }

  $outPath = Join-Path $frontend "src\app\icon.png"
  $newBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $newBmp.Dispose()
  $square.Dispose()

  Write-Host "Wrote $outPath ($((Get-Item $outPath).Length) bytes)"
} finally {
  $img.Dispose()
}
