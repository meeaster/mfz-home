# GPU rendering in WSL

Headless wgpu programs such as Psychopomp can render on the CPU in WSL even when Windows has a capable GPU. This page explains how to check which device a render uses and how to move it onto the GPU through Mesa's D3D12 OpenGL driver.

## Why renders fall back to the CPU

WSL exposes the GPU only through Direct3D 12 (`/dev/dxg` and the libraries in `/usr/lib/wsl/lib`). wgpu prefers Vulkan on Linux. Ubuntu's `mesa-vulkan-drivers` package does not include Mesa's Vulkan-on-D3D12 driver, so the only Vulkan device is llvmpipe, Mesa's CPU renderer. wgpu selects it, and renders run on the CPU.

## Check which device a render uses

Psychopomp prints the selected adapter at the start of every render:

```text
GPU: llvmpipe (LLVM 20.1.2, 256 bits) (Vulkan)
GPU: D3D12 (AMD Radeon RX 9070 XT) (Gl)
```

The first line is a CPU render. The second is a GPU render through Mesa's D3D12 OpenGL driver. To see which Vulkan drivers the machine provides, list `/usr/share/vulkan/icd.d/`. A GPU-backed driver for WSL appears as a `dzn_icd*.json` file (Mesa) or a vendor-supplied file.

If the first render on a machine already names the GPU, no workaround is needed.

## Render on the GPU through OpenGL

Set these variables for the render command only:

```sh
VK_ICD_FILENAMES=/nonexistent.json \
GALLIUM_DRIVER=d3d12 \
LD_LIBRARY_PATH=/usr/lib/wsl/lib \
MESA_D3D12_DEFAULT_ADAPTER_NAME=9070 \
cargo run --release -- plan render target/hello.json output/hello.mp4 --theme neutral
```

| Variable | Effect |
| --- | --- |
| `VK_ICD_FILENAMES` | Hides every Vulkan driver, so wgpu falls back to its OpenGL backend. |
| `GALLIUM_DRIVER=d3d12` | Makes Mesa's OpenGL use Direct3D 12 instead of llvmpipe. |
| `LD_LIBRARY_PATH` | Lets Mesa load WSL's Direct3D 12 libraries. |
| `MESA_D3D12_DEFAULT_ADAPTER_NAME` | Selects the adapter whose name contains this text. Set it to part of the target GPU's name, such as `9070` or `RTX`, when Windows has more than one GPU. |

The route works for any GPU with a Windows Direct3D 12 driver, because Mesa talks to Direct3D 12 rather than to a specific vendor. Get the adapter names from Windows:

```powershell
Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion
```

Do not export these variables from shell startup files. `VK_ICD_FILENAMES` breaks every Vulkan program in the shell, and `LD_LIBRARY_PATH` changes library lookup for all programs.

wgpu's OpenGL backend supports fewer features than Vulkan. If a scene fails only on this route, suspect a missing OpenGL feature before the scene itself.

## Measured on the Personal desktop

The Personal desktop has an AMD Radeon RX 9070 XT, Ubuntu 24.04 in WSL, and Mesa 25.2.8.

| Scene | llvmpipe | RX 9070 XT through D3D12 OpenGL |
| --- | --- | --- |
| `hello`, 240 frames | 77.7 s | 8.3 s |
| `effects-showroom`, 1572 frames | not measured | 78.7 s |

Frames from both routes matched visually. Startup prints `Dropped Escape call with ulEscapeCode : 0x03007703` from the WSL graphics driver; it is harmless.

## Tell agents on a new machine

Agents learn machine-specific render settings from a machine-local instruction file, not from this repository. On a machine that needs the workaround, write the confirmed variables to `~/.mindframe-z/instructions/psychopomp-gpu.md` and run `mfz apply`. Mindframe-Z appends every top-level Markdown file in that folder to the global instructions on that machine only.

```markdown
## Psychopomp GPU rendering

- **Tool:** On this WSL machine, run Psychopomp render commands with these variables set for that command only: `VK_ICD_FILENAMES=/nonexistent.json GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib MESA_D3D12_DEFAULT_ADAPTER_NAME=<part of GPU name>`. Never export them globally. Check that the render's `GPU:` line names the GPU.
```
