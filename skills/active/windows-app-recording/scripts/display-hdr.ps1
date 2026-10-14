# Report or switch Windows HDR (advanced color) on every active display.
#   display-hdr.ps1             -> one line per display: "display=<id> hdr=on|off supported=yes|no"
#   display-hdr.ps1 -Set off    -> switches HDR, then prints the same lines
# Same switch as Win+Alt+B or Settings > Display > Use HDR; takes effect immediately.
param([ValidateSet("on", "off")][string]$Set)
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class Hdr {
  [StructLayout(LayoutKind.Sequential)] public struct LUID { public uint Low; public int High; }
  [StructLayout(LayoutKind.Sequential)] public struct Header { public int type; public int size; public LUID adapterId; public uint id; }
  [StructLayout(LayoutKind.Sequential)] public struct GetColor { public Header h; public uint value; public uint encoding; public uint bits; }
  [StructLayout(LayoutKind.Sequential)] public struct SetColor { public Header h; public uint value; }
  [StructLayout(LayoutKind.Sequential)] public struct Source { public LUID adapterId; public uint id; public uint modeInfoIdx; public uint statusFlags; }
  [StructLayout(LayoutKind.Sequential)] public struct Target { public LUID adapterId; public uint id; public uint modeInfoIdx; public uint outputTechnology; public uint rotation; public uint scaling; public uint rrN; public uint rrD; public uint scanLineOrdering; public int targetAvailable; public uint statusFlags; }
  [StructLayout(LayoutKind.Sequential)] public struct Path { public Source source; public Target target; public uint flags; }
  [StructLayout(LayoutKind.Explicit, Size = 64)] public struct Mode { [FieldOffset(0)] public uint infoType; }
  [DllImport("user32.dll")] public static extern int GetDisplayConfigBufferSizes(uint flags, out uint paths, out uint modes);
  [DllImport("user32.dll")] public static extern int QueryDisplayConfig(uint flags, ref uint np, [Out] Path[] p, ref uint nm, [Out] Mode[] m, IntPtr topo);
  [DllImport("user32.dll")] public static extern int DisplayConfigGetDeviceInfo(ref GetColor p);
  [DllImport("user32.dll")] public static extern int DisplayConfigSetDeviceInfo(ref SetColor p);
}
"@
$np = 0; $nm = 0
[void][Hdr]::GetDisplayConfigBufferSizes(2, [ref]$np, [ref]$nm)   # QDC_ONLY_ACTIVE_PATHS
$paths = New-Object Hdr+Path[] $np; $modes = New-Object Hdr+Mode[] $nm
$r = [Hdr]::QueryDisplayConfig(2, [ref]$np, $paths, [ref]$nm, $modes, [IntPtr]::Zero)
if ($r -ne 0) { throw "QueryDisplayConfig failed: $r" }

# PowerShell copies nested structs on access, so build each header whole instead of setting $x.h.<field>.
function New-Header($path, [int]$type, [int]$size) {
  $h = New-Object Hdr+Header
  $h.type = $type; $h.size = $size; $h.adapterId = $path.target.adapterId; $h.id = $path.target.id
  $h
}
foreach ($p in $paths[0..($np - 1)]) {
  if ($Set) {
    $w = New-Object Hdr+SetColor
    $w.h = New-Header $p 10 ([Runtime.InteropServices.Marshal]::SizeOf($w))   # SET_ADVANCED_COLOR_STATE
    $w.value = [uint32]($Set -eq "on")
    $r = [Hdr]::DisplayConfigSetDeviceInfo([ref]$w); if ($r -ne 0) { throw "switching HDR failed: $r" }
  }
}
if ($Set) { Start-Sleep -Seconds 2 }
foreach ($p in $paths[0..($np - 1)]) {
  $g = New-Object Hdr+GetColor
  $g.h = New-Header $p 9 ([Runtime.InteropServices.Marshal]::SizeOf($g))   # GET_ADVANCED_COLOR_INFO
  $r = [Hdr]::DisplayConfigGetDeviceInfo([ref]$g); if ($r -ne 0) { throw "reading HDR state failed: $r" }
  "display={0} hdr={1} supported={2}" -f $p.target.id, @("off", "on")[($g.value -shr 1) -band 1], @("no", "yes")[$g.value -band 1]
}
