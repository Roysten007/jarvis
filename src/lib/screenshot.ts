import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'capture_screen.ps1');

// Créer le script PowerShell optimisé GDI BitBlt
function ensureScriptExists() {
  const dir = path.dirname(SCRIPT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const psCode = `
param (
    [Parameter(Mandatory=$true)]
    [string]$OutputFile
)

$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class ScreenCaptureNative {
    [DllImport("user32.dll")]
    public static extern IntPtr GetDesktopWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetDC(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

    [DllImport("gdi32.dll")]
    public static extern bool BitBlt(IntPtr hObject, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hObjectSource, int nXSrc, int nYSrc, int dwRop);

    [DllImport("gdi32.dll")]
    public static extern IntPtr CreateCompatibleBitmap(IntPtr hDC, int nWidth, int nHeight);

    [DllImport("gdi32.dll")]
    public static extern IntPtr CreateCompatibleDC(IntPtr hDC);

    [DllImport("gdi32.dll")]
    public static extern bool DeleteDC(IntPtr hDC);

    [DllImport("gdi32.dll")]
    public static extern bool DeleteObject(IntPtr hObject);

    [DllImport("gdi32.dll")]
    public static extern IntPtr SelectObject(IntPtr hDC, IntPtr hObject);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    public static void Capture(string filePath) {
        int width = GetSystemMetrics(0);
        int height = GetSystemMetrics(1);

        IntPtr hDesktop = GetDesktopWindow();
        IntPtr hDesktopDC = GetDC(hDesktop);
        IntPtr hCaptureDC = CreateCompatibleDC(hDesktopDC);
        IntPtr hCaptureBmp = CreateCompatibleBitmap(hDesktopDC, width, height);
        IntPtr hOldBmp = SelectObject(hCaptureDC, hCaptureBmp);

        BitBlt(hCaptureDC, 0, 0, width, height, hDesktopDC, 0, 0, 0x00CC0020);

        Bitmap bmp = Image.FromHbitmap(hCaptureBmp);

        SelectObject(hCaptureDC, hOldBmp);
        DeleteObject(hCaptureBmp);
        DeleteDC(hCaptureDC);
        ReleaseDC(hDesktop, hDesktopDC);

        bmp.Save(filePath, ImageFormat.Png);
        bmp.Dispose();
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

$dir = [System.IO.Path]::GetDirectoryName($OutputFile)
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

[ScreenCaptureNative]::Capture($OutputFile)
Write-Output "OK:$OutputFile"
`;

  fs.writeFileSync(SCRIPT_PATH, psCode.trim(), 'utf8');
}

export interface ScreenshotResult {
  success: boolean;
  filePath?: string;
  dataUrl?: string;
  error?: string;
}

export async function takeScreenCapture(): Promise<ScreenshotResult> {
  try {
    ensureScriptExists();

    const screenshotsDir = path.join(process.cwd(), '.data', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    const filename = `screenshot_${Date.now()}.png`;
    const outputPath = path.join(screenshotsDir, filename);

    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${SCRIPT_PATH}" -OutputFile "${outputPath}"`;
    execSync(cmd, { encoding: 'utf8', timeout: 8000 });

    if (!fs.existsSync(outputPath)) {
      return { success: false, error: 'Fichier capture d\'écran non généré' };
    }

    const buffer = fs.readFileSync(outputPath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;

    return {
      success: true,
      filePath: outputPath,
      dataUrl,
    };
  } catch (err: any) {
    console.error('[SCREENSHOT_ERROR]', err);
    return {
      success: false,
      error: err.message || 'Échec de la capture d\'écran',
    };
  }
}

export const takeScreenshotBitBlt = takeScreenCapture;

