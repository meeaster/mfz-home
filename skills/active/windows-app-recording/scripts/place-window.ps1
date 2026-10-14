# Bring a window to the front and place it so its visible frame covers X Y W H, in physical screen pixels.
# Picks the process's first visible titled window, or the one with an exact -Title or a -TitlePrefix (Chrome
# and Windows Terminal run several windows in one process). Prints the frame it ended up with.
param([Parameter(Mandatory)][string]$Name, [string]$Title, [string]$TitlePrefix,
      [Parameter(Mandatory)][int]$X, [Parameter(Mandatory)][int]$Y, [Parameter(Mandatory)][int]$W, [Parameter(Mandatory)][int]$H)
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public static class Pw {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, uint d, UIntPtr e);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int hh, uint f);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int s);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}
"@
[void][Pw]::SetProcessDPIAware()
$pids = @(Get-Process -Name $Name -ErrorAction Stop | ForEach-Object Id)
$found = [IntPtr]::Zero
[void][Pw]::EnumWindows({ param($h, $l)
  if (-not [Pw]::IsWindowVisible($h)) { return $true }
  $owner = 0; [void][Pw]::GetWindowThreadProcessId($h, [ref]$owner)
  if ($pids -notcontains [int]$owner) { return $true }
  $sb = New-Object Text.StringBuilder 512; [void][Pw]::GetWindowText($h, $sb, 512); $t = $sb.ToString()
  if (-not $t) { return $true }
  if (($Title -and $t -eq $Title) -or ($TitlePrefix -and $t.StartsWith($TitlePrefix)) -or (-not $Title -and -not $TitlePrefix)) {
    $script:found = $h; return $false
  }
  return $true
}, [IntPtr]::Zero)
if ($found -eq [IntPtr]::Zero) { throw "no $Name window matching '$Title$TitlePrefix'" }
[void][Pw]::ShowWindow($found, 9)   # restore from maximized/fullscreen
# A zero-distance synthetic mouse move lets this background process change the foreground window.
[Pw]::mouse_event(0x0001, 0, 0, 0, [UIntPtr]::Zero)
[void][Pw]::SetForegroundWindow($found)
Start-Sleep -Milliseconds 200
# The outer rect includes an invisible resize border; offset by the difference to the visible (DWM) frame.
$o = New-Object Pw+RECT; $v = New-Object Pw+RECT
[void][Pw]::GetWindowRect($found, [ref]$o)
[void][Pw]::DwmGetWindowAttribute($found, 9, [ref]$v, 16)
$dl = $v.L - $o.L; $dt = $v.T - $o.T; $dr = $o.R - $v.R; $db = $o.B - $v.B
[void][Pw]::SetWindowPos($found, [IntPtr]::Zero, $X - $dl, $Y - $dt, $W + $dl + $dr, $H + $dt + $db, 0x0040)   # SWP_SHOWWINDOW
Start-Sleep -Milliseconds 200
[void][Pw]::DwmGetWindowAttribute($found, 9, [ref]$v, 16)
"{0} {1} {2} {3}" -f $v.L, $v.T, ($v.R - $v.L), ($v.B - $v.T)
