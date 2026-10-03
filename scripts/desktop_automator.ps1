param(
    [string]$TargetTitle = "",
    [string]$ProcessName = "",
    [string]$KeysToSend = "{ENTER}",
    [string]$ClipText = "",
    [int]$WaitBeforeMs = 1500,
    [int]$TimeoutMs = 8000,
    [string]$StepsJson = ""
)

$ErrorActionPreference = 'Stop'

Add-Type -ReferencedAssemblies "System.Windows.Forms" -TypeDefinition @"
using System;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class DesktopAutomator {
  [DllImport("user32.dll", SetLastError = true)]
  static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

  [DllImport("user32.dll", SetLastError = true)]
  static extern bool SetThreadDesktop(IntPtr hDesktop);

  [DllImport("user32.dll", SetLastError = true)]
  static extern bool CloseDesktop(IntPtr hDesktop);

  delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll", CharSet = CharSet.Auto)] static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);

  public class Result {
    public bool Found = false;
    public bool Foreground = false;
    public string Title = "";
    public long Hwnd = 0;
    public string Error = "";
    public int StepsExecuted = 0;
  }

  public class AutomationStep {
    public int WaitMs = 0;
    public string Clip = null;
    public string Keys = null;
  }

  public static Result RunAutomation(string titleFilter, string procFilter, List<AutomationStep> steps, int waitBeforeMs, int timeoutMs) {
    Result res = new Result();
    IntPtr hDefault = OpenDesktop("default", 0, false, 0x01FF); // DESKTOP_ALL_ACCESS
    if (hDefault == IntPtr.Zero) {
      res.Error = "OpenDesktop failed: " + Marshal.GetLastWin32Error();
      return res;
    }

    Thread worker = new Thread(() => {
      try {
        if (!SetThreadDesktop(hDefault)) {
          res.Error = "SetThreadDesktop failed: " + Marshal.GetLastWin32Error();
          return;
        }

        IntPtr targetHwnd = IntPtr.Zero;
        string matchedTitle = "";

        DateTime start = DateTime.Now;
        while ((DateTime.Now - start).TotalMilliseconds < timeoutMs) {
          EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            StringBuilder sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, 256);
            string t = sb.ToString();

            uint pid = 0;
            GetWindowThreadProcessId(hWnd, out pid);
            string pName = "";
            try {
              pName = System.Diagnostics.Process.GetProcessById((int)pid).ProcessName;
            } catch {}

            bool matchTitle = !string.IsNullOrEmpty(titleFilter) && t.IndexOf(titleFilter, StringComparison.OrdinalIgnoreCase) >= 0;
            bool matchProc = !string.IsNullOrEmpty(procFilter) && pName.IndexOf(procFilter, StringComparison.OrdinalIgnoreCase) >= 0;

            if (matchTitle || matchProc) {
              targetHwnd = hWnd;
              matchedTitle = t;
              return false; // Stop Enum
            }
            return true;
          }, IntPtr.Zero);

          if (targetHwnd != IntPtr.Zero) break;
          Thread.Sleep(250);
        }

        if (targetHwnd == IntPtr.Zero) {
          res.Error = "Window matching Title:'" + titleFilter + "' / Proc:'" + procFilter + "' not found within " + timeoutMs + "ms";
          return;
        }

        res.Found = true;
        res.Hwnd = targetHwnd.ToInt64();
        res.Title = matchedTitle;

        // Force to Foreground
        keybd_event(0x12, 0, 0, UIntPtr.Zero); // Alt Down
        keybd_event(0x12, 0, 2, UIntPtr.Zero); // Alt Up
        ShowWindow(targetHwnd, 9); // SW_RESTORE
        ShowWindow(targetHwnd, 5); // SW_SHOW
        SetForegroundWindow(targetHwnd);
        Thread.Sleep(250);
        res.Foreground = (GetForegroundWindow() == targetHwnd);

        if (waitBeforeMs > 0) Thread.Sleep(waitBeforeMs);

        // Execute steps
        if (steps != null && steps.Count > 0) {
          foreach (var step in steps) {
            if (step.WaitMs > 0) Thread.Sleep(step.WaitMs);
            if (!string.IsNullOrEmpty(step.Clip)) {
              // Ensure foreground
              SetForegroundWindow(targetHwnd);
              System.Windows.Forms.Clipboard.SetText(step.Clip);
            }
            if (!string.IsNullOrEmpty(step.Keys)) {
              // Re-check foreground before sending keys
              SetForegroundWindow(targetHwnd);
              System.Windows.Forms.SendKeys.SendWait(step.Keys);
            }
            res.StepsExecuted++;
          }
        }
      } catch (Exception ex) {
        res.Error = ex.Message;
      }
    });

    worker.Start();
    worker.Join();
    CloseDesktop(hDefault);

    return res;
  }
}
"@

$stepList = New-Object 'System.Collections.Generic.List[DesktopAutomator+AutomationStep]'

if ($StepsJson) {
    try {
        $parsedSteps = $StepsJson | ConvertFrom-Json
        foreach ($s in $parsedSteps) {
            $stepObj = New-Object DesktopAutomator+AutomationStep
            if ($s.waitMs) { $stepObj.WaitMs = [int]$s.waitMs }
            if ($s.clip) { $stepObj.Clip = [string]$s.clip }
            if ($s.keys) { $stepObj.Keys = [string]$s.keys }
            $stepList.Add($stepObj)
        }
    } catch {
        Write-Error "Invalid StepsJson: $_"
    }
} elseif ($KeysToSend -or $ClipText) {
    $stepObj = New-Object DesktopAutomator+AutomationStep
    $stepObj.WaitMs = 100
    if ($ClipText) { $stepObj.Clip = $ClipText }
    if ($KeysToSend) { $stepObj.Keys = $KeysToSend }
    $stepList.Add($stepObj)
}

$r = [DesktopAutomator]::RunAutomation($TargetTitle, $ProcessName, $stepList, $WaitBeforeMs, $TimeoutMs)
$r | ConvertTo-Json -Compress
