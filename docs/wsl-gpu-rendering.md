# GPU rendering in WSL

Headless wgpu programs such as Psychopomp can render on the CPU in WSL even when Windows has a capable GPU. This page explains how to check which device a render uses and how to move it onto the GPU through Vulkan on Mesa's Dozen driver.

## Why renders fall back to the CPU

WSL exposes the GPU only through Direct3D 12 (`/dev/dxg` and the libraries in `/usr/lib/wsl/lib`). wgpu prefers Vulkan on Linux, so it needs a Vulkan driver that runs on Direct3D 12. Mesa's Dozen driver (`dzn`) is that driver, but two things keep wgpu from using it by default:

- Some Mesa builds leave Dozen out. Ubuntu 24.04's stock `mesa-vulkan-drivers` package did; the kisak-mesa PPA build includes it as `/usr/share/vulkan/icd.d/dzn_icd.json`.
- Dozen reports itself as a non-conformant Vulkan implementation, and wgpu skips non-conformant adapters unless the program allows them.

Without Dozen, the only Vulkan device is llvmpipe or lavapipe, Mesa's CPU renderers. wgpu selects one, and renders run on the CPU.

## Check which device a render uses

Psychopomp prints the selected adapter at the start of every render:

```text
GPU: llvmpipe (LLVM 21.1.8, 256 bits) (Vulkan)
GPU: Microsoft Direct3D12 (AMD Radeon RX 9070 XT) (Vulkan)
GPU: D3D12 (AMD Radeon RX 9070 XT) (Gl)
```

The first line is a CPU render. The second is a GPU render through Dozen. The third is a GPU render through Mesa's D3D12 OpenGL driver, the older route described at the end of this page.

To see whether Dozen can reach the GPU, run `vulkaninfo --summary` with only the Dozen driver visible:

```sh
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/dzn_icd.json \
LD_LIBRARY_PATH=/usr/lib/wsl/lib \
vulkaninfo --summary
```

Each GPU appears as `Microsoft Direct3D12 (<adapter name>)` with driver name `Dozen`. A warning that Dozen is not conformant is expected.

If the first render on a machine already names the GPU, no workaround is needed.

## Render on the GPU through Vulkan

The program must build its wgpu instance from the environment, for example with `wgpu::InstanceDescriptor::new_without_display_handle_from_env()`. `wgpu::Instance::default()` ignores the `WGPU_*` variables below, so wgpu still skips Dozen and the render stays on the CPU.

In Psychopomp, wgpu instances are created in two places: the headless renderer in `crates/psychopomp-render/src/render.rs` (`HeadlessRenderer::new`) and the native presenter in `crates/psychopomp-render/src/plan_runtime/presentation/gpu.rs` (`Presenter::new`). Both need this change:

```rust
// before
let instance = wgpu::Instance::default();
// after
let instance =
    wgpu::Instance::new(wgpu::InstanceDescriptor::new_without_display_handle_from_env());
```

With no `WGPU_*` variables set, the new form behaves like `Instance::default()`.

Set these variables for the render command only:

```sh
VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/dzn_icd.json \
WGPU_BACKEND=vulkan \
WGPU_ALLOW_UNDERLYING_NONCOMPLIANT_ADAPTER=1 \
LD_LIBRARY_PATH=/usr/lib/wsl/lib \
MESA_D3D12_DEFAULT_ADAPTER_NAME=9070 \
cargo run --release -- plan render target/hello.json output/hello.mp4 --theme neutral
```

| Variable | Effect |
| --- | --- |
| `VK_ICD_FILENAMES` | Makes Dozen the only Vulkan driver, so wgpu cannot pick a CPU renderer instead. |
| `WGPU_BACKEND=vulkan` | Keeps wgpu from falling back to OpenGL, which would otherwise run on llvmpipe. |
| `WGPU_ALLOW_UNDERLYING_NONCOMPLIANT_ADAPTER=1` | Lets wgpu use Dozen even though Dozen reports itself as non-conformant. |
| `LD_LIBRARY_PATH` | Lets Mesa load WSL's Direct3D 12 libraries. |
| `MESA_D3D12_DEFAULT_ADAPTER_NAME` | Prefers the adapter whose name contains this text. Set it to part of the target GPU's name, such as `9070` or `RTX`, when Windows has more than one GPU. |

The route works for any GPU with a Windows Direct3D 12 driver, because Dozen talks to Direct3D 12 rather than to a specific vendor. Get the adapter names from Windows:

```powershell
Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion
```

Do not export these variables from shell startup files. `VK_ICD_FILENAMES` hides every other Vulkan driver in the shell, and `LD_LIBRARY_PATH` changes library lookup for all programs.

To force a CPU render for comparison, point `VK_ICD_FILENAMES` at `/usr/share/vulkan/icd.d/lvp_icd.json` (lavapipe) and drop the other variables.

## Measured on the Personal desktop

The Personal desktop has an AMD Radeon RX 9070 XT, Ubuntu 24.04 in WSL, Mesa 26.2.4 from the kisak-mesa PPA, and wgpu 30.

| Clip | Frames | OpenGL route | Dozen |
| --- | --- | --- | --- |
| OpenCode deck, title loop | 1078 | 28.9 s | 27.9 s |
| OpenCode deck, gateway intro | 456 | hung every run | 18.7 s |
| One gateway range, 20 runs | 3 each | 18 hung | 0 hung |

Dozen frames matched lavapipe CPU frames at about 60 dB PSNR, which is rounding-level difference. Both GPU routes are equally fast because the GPU is not the bottleneck: each frame waits in turn on a GPU-to-CPU copy, CPU work, and writing to the encoder. Startup prints `Dropped Escape call with ulEscapeCode : 0x03007703` from the WSL graphics driver; it is harmless.

## The older OpenGL route

Before Dozen was available, this machine rendered through Mesa's D3D12 OpenGL driver: `VK_ICD_FILENAMES=/nonexistent.json GALLIUM_DRIVER=d3d12` plus the same `LD_LIBRARY_PATH` and `MESA_D3D12_DEFAULT_ADAPTER_NAME`. It needs no program change, because hiding every Vulkan driver makes wgpu fall back to OpenGL on its own.

With Mesa 26.2.4 that driver deadlocks during renders. The render thread waits on a lock inside `libgallium` while the driver's worker thread waits for a signal that never arrives. The GPU sits idle, so Windows logs no GPU reset, and restarting WSL does not help. Whether it hangs depends on the scene content and on timing: some ranges hang on most attempts, while others never do. Disabling Mesa's threaded context with `GALLIUM_THREAD=0` did not change the rate. Use Dozen instead. If a render must use this route, run it under a watchdog that restarts stalled renders on the CPU.

## Tell agents on a new machine

Agents learn machine-specific render settings from a machine-local instruction file, not from this repository. On a machine that needs the workaround, write the confirmed variables to `~/.mindframe-z/instructions/psychopomp-gpu.md` and run `mfz apply`. Mindframe-Z appends every top-level Markdown file in that folder to the global instructions on that machine only.

```markdown
## Psychopomp GPU rendering

- **Tool:** On this WSL machine, run Psychopomp render commands with these variables set for that command only: `VK_ICD_FILENAMES=/usr/share/vulkan/icd.d/dzn_icd.json WGPU_BACKEND=vulkan WGPU_ALLOW_UNDERLYING_NONCOMPLIANT_ADAPTER=1 LD_LIBRARY_PATH=/usr/lib/wsl/lib MESA_D3D12_DEFAULT_ADAPTER_NAME=<part of GPU name>`. Never export them globally. Check that the render's `GPU:` line names the GPU and `(Vulkan)`.
```
