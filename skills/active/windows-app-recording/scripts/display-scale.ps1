# Get or set the primary display's scaling (percent) immediately, without signing out.
# Uses the DisplayConfig DPI calls that Windows Settings uses (undocumented device-info types -3 / -4),
# which work in steps relative to the monitor's recommended scale.
#   display-scale.ps1            -> prints "current=<pct> recommended=<pct> min=<pct> max=<pct> work=<W>x<H>"
#   display-scale.ps1 -Set 175   -> sets the scale, then prints the same line
# work is the primary monitor's work area (above the taskbar) in physical pixels, which changes with the scale.
param([int]$Set)
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class Dpi {
  [StructLayout(LayoutKind.Sequential)] public struct LUID { public uint Low; public int High; }
  [StructLayout(LayoutKind.Sequential)] public struct Header { public int type; public int size; public LUID adapterId; public uint id; }
  [StructLayout(LayoutKind.Sequential)] public struct GetScale { public Header h; public int min; public int cur; public int max; }
  [StructLayout(LayoutKind.Sequential)] public struct SetScale { public Header h; public int scale; }
  [StructLayout(LayoutKind.Sequential)] public struct Source { public LUID adapterId; public uint id; public uint modeInfoIdx; public uint statusFlags; }
  [StructLayout(LayoutKind.Sequential)] public struct Target { public LUID adapterId; public uint id; public uint modeInfoIdx; public uint outputTechnology; public uint rotation; public uint scaling; public uint rrN; public uint rrD; public uint scanLineOrdering; public int targetAvailable; public uint statusFlags; }
  [StructLayout(LayoutKind.Sequential)] public struct Path { public Source source; public Target target; public uint flags; }
  [StructLayout(LayoutKind.Explicit, Size = 64)] public struct Mode { [FieldOffset(0)] public uint infoType; [FieldOffset(4)] public uint id; [FieldOffset(8)] public LUID adapterId; [FieldOffset(16)] public uint width; [FieldOffset(20)] public uint height; [FieldOffset(24)] public uint pixelFormat; [FieldOffset(28)] public int x; [FieldOffset(32)] public int y; }
  [DllImport("user32.dll")] public static extern int GetDisplayConfigBufferSizes(uint flags, out uint paths, out uint modes);
  [DllImport("user32.dll")] public static extern int QueryDisplayConfig(uint flags, ref uint np, [Out] Path[] p, ref uint nm, [Out] Mode[] m, IntPtr topo);
  [DllImport("user32.dll")] public static extern int DisplayConfigGetDeviceInfo(ref GetScale p);
  [DllImport("user32.dll")] public static extern int DisplayConfigSetDeviceInfo(ref SetScale p);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct MONITORINFO { public int Size; public RECT Monitor; public RECT Work; public uint Flags; }
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr c);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromPoint(long pt, uint f);
  [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr m, ref MONITORINFO i);
}
"@
$steps = 100, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500
$np = 0; $nm = 0
[void][Dpi]::GetDisplayConfigBufferSizes(2, [ref]$np, [ref]$nm)   # QDC_ONLY_ACTIVE_PATHS
$paths = New-Object Dpi+Path[] $np; $modes = New-Object Dpi+Mode[] $nm
$r = [Dpi]::QueryDisplayConfig(2, [ref]$np, $paths, [ref]$nm, $modes, [IntPtr]::Zero)
if ($r -ne 0) { throw "QueryDisplayConfig failed: $r" }
# The primary monitor's source mode sits at desktop position 0,0.
$path = $paths[0..($np - 1)] | Where-Object { $m = $modes[$_.source.modeInfoIdx]; $m.infoType -eq 1 -and $m.x -eq 0 -and $m.y -eq 0 } | Select-Object -First 1
if (-not $path) { $path = $paths[0] }

# PowerShell copies nested structs on access, so build the header whole instead of setting $x.h.<field>.
function New-Header([int]$type, [int]$size) {
  $h = New-Object Dpi+Header
  $h.type = $type; $h.size = $size; $h.adapterId = $path.source.adapterId; $h.id = $path.source.id
  $h
}
function Read-Scale {
  $g = New-Object Dpi+GetScale
  $g.h = New-Header -3 ([Runtime.InteropServices.Marshal]::SizeOf($g))
  $r = [Dpi]::DisplayConfigGetDeviceInfo([ref]$g); if ($r -ne 0) { throw "get scale failed: $r" }
  $rec = [Math]::Abs($g.min)   # min is the (negative) number of steps below recommended
  [pscustomobject]@{ Rec = $rec; Cur = $steps[$rec + $g.cur]; RecPct = $steps[$rec]; Min = $steps[0]; Max = $steps[[Math]::Min($rec + $g.max, $steps.Count - 1)] }
}
$s = Read-Scale
if ($Set) {
  $target = [Array]::IndexOf($steps, $Set); if ($target -lt 0) { throw "unsupported scale $Set; use one of $($steps -join ', ')" }
  $w = New-Object Dpi+SetScale
  $w.h = New-Header -4 ([Runtime.InteropServices.Marshal]::SizeOf($w))
  $w.scale = $target - $s.Rec
  $r = [Dpi]::DisplayConfigSetDeviceInfo([ref]$w); if ($r -ne 0) { throw "set scale failed: $r" }
  Start-Sleep -Milliseconds 500
  $s = Read-Scale
}
# Per-monitor awareness reads physical pixels at the current scale; plain SetProcessDPIAware keeps the scale the
# process started with, so the work area came out halved after switching from 125% to 250%.
[void][Dpi]::SetProcessDpiAwarenessContext([IntPtr]::new(-4))   # PER_MONITOR_AWARE_V2
$mi = New-Object Dpi+MONITORINFO; $mi.Size = [Runtime.InteropServices.Marshal]::SizeOf($mi)
[void][Dpi]::GetMonitorInfo([Dpi]::MonitorFromPoint(0, 1), [ref]$mi)   # primary monitor holds (0,0)
"current={0} recommended={1} min={2} max={3} work={4}x{5}" -f $s.Cur, $s.RecPct, $s.Min, $s.Max, ($mi.Work.R - $mi.Work.L), ($mi.Work.B - $mi.Work.T)
