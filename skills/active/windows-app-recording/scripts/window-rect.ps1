# Bring a process's main window to the front and print, in physical screen pixels:
#   "x y width height clientX clientY"
# The rectangle is the window's visible frame, trimmed to its monitor's work area so the taskbar stays out;
# clientX/clientY is the top-left of the window's content area (below the title bar).
# -Title picks the process's window with exactly that title instead of its main window (Windows Terminal runs
# every window in one process).
# Exits 3 when Windows refuses to bring the window to the front (focus-stealing protection), since a covered
# window would be recorded as whatever is on top of it.
param([Parameter(Mandatory)][string]$Name, [string]$Title)
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class Win {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr FindWindow(string c, string t);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, uint d, UIntPtr e);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, uint f);
  [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO i);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out RECT r, int s);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int Size; public RECT Monitor; public RECT Work; public uint Flags; }
}
"@
[void][Win]::SetProcessDPIAware()
if ($Title) {
  # A plain $null would reach FindWindow as "" and match no class.
  $h = [Win]::FindWindow([NullString]::Value, $Title)
  $owner = 0; [void][Win]::GetWindowThreadProcessId($h, [ref]$owner)
  if ($h -eq [IntPtr]::Zero -or (Get-Process -Id $owner).ProcessName -ne $Name) { throw "no $Name window titled '$Title'" }
} else {
  $p = Get-Process -Name $Name -ErrorAction Stop | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if (-not $p) { throw "no window for process $Name" }
  $h = $p.MainWindowHandle
}
[void][Win]::ShowWindow($h, 9)   # restore if minimized
# A synthetic zero-distance mouse move makes this process the last input source, which Windows requires before
# it lets a background process change the foreground window. (A synthetic Alt press also works but leaves the
# target app in menu mode, which freezes a WebView2 page and its DevTools port until Escape.)
[Win]::mouse_event(0x0001, 0, 0, 0, [UIntPtr]::Zero)
[void][Win]::SetForegroundWindow($h)
Start-Sleep -Milliseconds 300
if ([Win]::GetForegroundWindow() -ne $h) { [Console]::Error.WriteLine("could not bring $Name to the front"); exit 3 }

$r = New-Object Win+RECT
# Extended frame bounds exclude the invisible resize border; fall back to the plain window rect.
if ([Win]::DwmGetWindowAttribute($h, 9, [ref]$r, 16) -ne 0 -or $r.R -eq 0) { [void][Win]::GetWindowRect($h, [ref]$r) }
$m = New-Object Win+MONITORINFO
$m.Size = [Runtime.InteropServices.Marshal]::SizeOf($m)
[void][Win]::GetMonitorInfo([Win]::MonitorFromWindow($h, 2), [ref]$m)
$left = [Math]::Max($r.L, $m.Work.L); $top = [Math]::Max($r.T, $m.Work.T)
$right = [Math]::Min($r.R, $m.Work.R); $bottom = [Math]::Min($r.B, $m.Work.B)
$c = New-Object Win+POINT
[void][Win]::ClientToScreen($h, [ref]$c)
"{0} {1} {2} {3} {4} {5}" -f $left, $top, ($right - $left), ($bottom - $top), $c.X, $c.Y
