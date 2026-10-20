$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outputPath = Join-Path $PSScriptRoot '..\build\icon.ico'
$sizes = @(16, 24, 32, 48, 64, 128, 256)

function New-RoundRectPath([single]$x, [single]$y, [single]$width, [single]$height, [single]$radius) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-IconPng([int]$size) {
  $scale = 4
  $canvasSize = $size * $scale
  $bitmap = [System.Drawing.Bitmap]::new($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $unit = $canvasSize / 512.0

  $tilePath = New-RoundRectPath (12 * $unit) (12 * $unit) (488 * $unit) (488 * $unit) (126 * $unit)
  $tileBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.PointF]::new(32 * $unit, 32 * $unit),
    [System.Drawing.PointF]::new(480 * $unit, 480 * $unit),
    [System.Drawing.Color]::FromArgb(255, 48, 55, 47),
    [System.Drawing.Color]::FromArgb(255, 17, 20, 16))
  $graphics.FillPath($tileBrush, $tilePath)

  $shadowPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 82, 106, 45), 78 * $unit)
  $shadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $shadowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.TranslateTransform(0, 17 * $unit)
  $graphics.DrawLine($shadowPen, 126 * $unit, 382 * $unit, 372 * $unit, 136 * $unit)
  $graphics.DrawLine($shadowPen, 198 * $unit, 136 * $unit, 372 * $unit, 136 * $unit)
  $graphics.DrawLine($shadowPen, 372 * $unit, 136 * $unit, 372 * $unit, 310 * $unit)
  $graphics.ResetTransform()

  $arrowBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.PointF]::new(110 * $unit, 105 * $unit),
    [System.Drawing.PointF]::new(395 * $unit, 395 * $unit),
    [System.Drawing.Color]::FromArgb(255, 239, 255, 167),
    [System.Drawing.Color]::FromArgb(255, 145, 181, 60))
  $arrowPen = [System.Drawing.Pen]::new($arrowBrush, 60 * $unit)
  $arrowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $arrowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $arrowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLine($arrowPen, 126 * $unit, 382 * $unit, 372 * $unit, 136 * $unit)
  $graphics.DrawLine($arrowPen, 198 * $unit, 136 * $unit, 372 * $unit, 136 * $unit)
  $graphics.DrawLine($arrowPen, 372 * $unit, 136 * $unit, 372 * $unit, 310 * $unit)

  $scaled = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $smallGraphics = [System.Drawing.Graphics]::FromImage($scaled)
  $smallGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $smallGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $smallGraphics.DrawImage($bitmap, 0, 0, $size, $size)
  $stream = [System.IO.MemoryStream]::new()
  $scaled.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $stream.ToArray()

  $stream.Dispose(); $smallGraphics.Dispose(); $scaled.Dispose()
  $arrowPen.Dispose(); $arrowBrush.Dispose(); $shadowPen.Dispose(); $tileBrush.Dispose()
  $tilePath.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
  return ,$bytes
}

$images = foreach ($size in $sizes) { [pscustomobject]@{ Size = $size; Bytes = (New-IconPng $size) } }
$directorySize = 6 + 16 * $images.Count
$offset = $directorySize
$stream = [System.IO.File]::Create([System.IO.Path]::GetFullPath($outputPath))
$writer = [System.IO.BinaryWriter]::new($stream)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$images.Count)
foreach ($image in $images) {
  $dimension = if ($image.Size -eq 256) { [byte]0 } else { [byte]$image.Size }
  $writer.Write($dimension); $writer.Write($dimension); $writer.Write([byte]0); $writer.Write([byte]0)
  $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$image.Bytes.Length); $writer.Write([uint32]$offset)
  $offset += $image.Bytes.Length
}
foreach ($image in $images) { $writer.Write($image.Bytes) }
$writer.Dispose(); $stream.Dispose()
Write-Output "Created $([System.IO.Path]::GetFullPath($outputPath))"
