Add-Type -AssemblyName System.Drawing

function Generate-ShieldIcon {
    param(
        [string]$outputPath,
        [int]$targetSize
    )

    # Render at high resolution (512x512) for supersampling
    $renderSize = 512
    $srcBmp = New-Object System.Drawing.Bitmap($renderSize, $renderSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($srcBmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # 1. Shield Path
    $shieldPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    
    # Coordinates for modern curved shield
    # Top center: (256, 40)
    # Top-right corner: (450, 75)
    # Right bulge: (460, 240)
    # Bottom tip: (256, 480)
    # Left bulge: (52, 240)
    # Top-left corner: (62, 75)

    $shieldPath.AddBezier(
        [System.Drawing.PointF]::new(256, 42),
        [System.Drawing.PointF]::new(360, 42),
        [System.Drawing.PointF]::new(430, 60),
        [System.Drawing.PointF]::new(452, 85)
    )
    $shieldPath.AddBezier(
        [System.Drawing.PointF]::new(452, 85),
        [System.Drawing.PointF]::new(465, 230),
        [System.Drawing.PointF]::new(400, 360),
        [System.Drawing.PointF]::new(256, 475)
    )
    $shieldPath.AddBezier(
        [System.Drawing.PointF]::new(256, 475),
        [System.Drawing.PointF]::new(112, 360),
        [System.Drawing.PointF]::new(47, 230),
        [System.Drawing.PointF]::new(60, 85)
    )
    $shieldPath.AddBezier(
        [System.Drawing.PointF]::new(60, 85),
        [System.Drawing.PointF]::new(82, 60),
        [System.Drawing.PointF]::new(152, 42),
        [System.Drawing.PointF]::new(256, 42)
    )
    $shieldPath.CloseFigure()

    # Outer Shield Fill - Vibrant Neon Cyan to Rich Electric Blue
    $shieldRect = [System.Drawing.RectangleF]::new(40, 30, 432, 450)
    $shieldGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $shieldRect,
        [System.Drawing.Color]::FromArgb(255, 0, 220, 255),   # Vibrant Cyan
        [System.Drawing.Color]::FromArgb(255, 10, 40, 140),   # Deep Blue
        65 # angle
    )
    $g.FillPath($shieldGrad, $shieldPath)

    # Outer Rim Border
    $rimPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 255, 255, 255), 10)
    $rimPen.Alignment = [System.Drawing.Drawing2D.PenAlignment]::Inset
    $g.DrawPath($rimPen, $shieldPath)

    # 2. Inner Shield Plate (Dark metallic plate for high contrast)
    $innerPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $innerPath.AddBezier(
        [System.Drawing.PointF]::new(256, 75),
        [System.Drawing.PointF]::new(340, 75),
        [System.Drawing.PointF]::new(395, 90),
        [System.Drawing.PointF]::new(415, 110)
    )
    $innerPath.AddBezier(
        [System.Drawing.PointF]::new(415, 110),
        [System.Drawing.PointF]::new(425, 225),
        [System.Drawing.PointF]::new(370, 335),
        [System.Drawing.PointF]::new(256, 435)
    )
    $innerPath.AddBezier(
        [System.Drawing.PointF]::new(256, 435),
        [System.Drawing.PointF]::new(142, 335),
        [System.Drawing.PointF]::new(87, 225),
        [System.Drawing.PointF]::new(97, 110)
    )
    $innerPath.AddBezier(
        [System.Drawing.PointF]::new(97, 110),
        [System.Drawing.PointF]::new(117, 90),
        [System.Drawing.PointF]::new(172, 75),
        [System.Drawing.PointF]::new(256, 75)
    )
    $innerPath.CloseFigure()

    $innerGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $shieldRect,
        [System.Drawing.Color]::FromArgb(255, 12, 22, 48),    # Midnight Navy
        [System.Drawing.Color]::FromArgb(255, 20, 50, 110),   # Royal Navy
        90
    )
    $g.FillPath($innerGrad, $innerPath)

    # Inner glow outline
    $innerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(160, 0, 210, 255), 4)
    $g.DrawPath($innerPen, $innerPath)

    # 3. Top Glass Specular Arc
    $specularPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $specularPath.AddBezier(
        [System.Drawing.PointF]::new(256, 82),
        [System.Drawing.PointF]::new(330, 82),
        [System.Drawing.PointF]::new(375, 95),
        [System.Drawing.PointF]::new(395, 115)
    )
    $specularPath.AddBezier(
        [System.Drawing.PointF]::new(395, 115),
        [System.Drawing.PointF]::new(340, 125),
        [System.Drawing.PointF]::new(280, 130),
        [System.Drawing.PointF]::new(256, 130)
    )
    $specularPath.AddBezier(
        [System.Drawing.PointF]::new(256, 130),
        [System.Drawing.PointF]::new(232, 130),
        [System.Drawing.PointF]::new(172, 125),
        [System.Drawing.PointF]::new(117, 115)
    )
    $specularPath.AddBezier(
        [System.Drawing.PointF]::new(117, 115),
        [System.Drawing.PointF]::new(137, 95),
        [System.Drawing.PointF]::new(182, 82),
        [System.Drawing.PointF]::new(256, 82)
    )
    $specularPath.CloseFigure()
    $specularBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 255, 255, 255))
    $g.FillPath($specularBrush, $specularPath)

    # 4. Lightning Bolt (Precision Geometry)
    $boltPoints = @(
        [System.Drawing.PointF]::new(282, 125),  # Top tip
        [System.Drawing.PointF]::new(182, 260),  # Mid inner left
        [System.Drawing.PointF]::new(252, 260),  # Center step right
        [System.Drawing.PointF]::new(232, 385),  # Bottom tip
        [System.Drawing.PointF]::new(332, 240),  # Mid outer right
        [System.Drawing.PointF]::new(264, 240)   # Center step left
    )

    # Shadow for lightning bolt
    $boltShadowPoints = @(
        [System.Drawing.PointF]::new(282, 129),
        [System.Drawing.PointF]::new(182, 264),
        [System.Drawing.PointF]::new(252, 264),
        [System.Drawing.PointF]::new(232, 389),
        [System.Drawing.PointF]::new(332, 244),
        [System.Drawing.PointF]::new(264, 244)
    )
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
    $g.FillPolygon($shadowBrush, $boltShadowPoints)

    # White / Light-cyan gradient for bolt
    $boltRect = [System.Drawing.RectangleF]::new(180, 120, 160, 270)
    $boltGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $boltRect,
        [System.Drawing.Color]::FromArgb(255, 255, 255, 255),
        [System.Drawing.Color]::FromArgb(255, 180, 240, 255),
        90
    )
    $g.FillPolygon($boltGrad, $boltPoints)

    # Crisp bolt highlight border
    $boltPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255, 255), 2)
    $g.DrawPolygon($boltPen, $boltPoints)

    $g.Dispose()

    # Now downsample with high quality bicubic interpolation to target size
    $dstBmp = New-Object System.Drawing.Bitmap($targetSize, $targetSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $dg = [System.Drawing.Graphics]::FromImage($dstBmp)
    $dg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $dg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $dg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $dg.Clear([System.Drawing.Color]::Transparent)

    # For 16px icon, use slightly higher contrast and thicker bolt to remain crystal clear on toolbar
    if ($targetSize -le 24) {
        $dg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBilinear
    } else {
        $dg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    }

    $dg.DrawImage($srcBmp, 0, 0, $targetSize, $targetSize)
    $dg.Dispose()
    $srcBmp.Dispose()

    $dstBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dstBmp.Dispose()

    Write-Host "Generated $outputPath ($targetSize x $targetSize)"
}

$dir = "C:\Users\athul_nuy2ni9\.gemini\antigravity\scratch\speedshield-adblocker\icons"
Generate-ShieldIcon -outputPath "$dir\icon128.png" -targetSize 128
Generate-ShieldIcon -outputPath "$dir\icon48.png" -targetSize 48
Generate-ShieldIcon -outputPath "$dir\icon32.png" -targetSize 32
Generate-ShieldIcon -outputPath "$dir\icon16.png" -targetSize 16
