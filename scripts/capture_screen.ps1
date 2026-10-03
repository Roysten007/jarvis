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