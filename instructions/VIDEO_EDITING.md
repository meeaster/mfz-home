# Video editing and rendering

## Hardware selection

- **Behavior:** Prefer GPU acceleration for video encoding and scene rendering; use software when hardware support or required quality/features are unsuitable, and state the reason.
- **Behavior:** Identify the host OS, GPU, and available backend before selecting acceleration.
- **Behavior:** Verify a short representative job before a long run.
- **Behavior:** Select acceleration for scene rendering, encoding, decoding, and filters separately.
- **Fact:** Stream-copy operations need no encoder.
- **Behavior:** Keep backend overrides scoped to the command.

## FFmpeg

- **Tool:** Inspect the installed binary's encoders and test the selected encoder; a listing alone does not prove driver access.
- **Tool:** For NVIDIA, prefer NVENC (`h264_nvenc` / `hevc_nvenc`).
- **Tool:** For AMD on Windows, prefer AMF (`h264_amf` / `hevc_amf`).
- **Behavior:** Use AV1 only after confirming GPU support and playback requirements.
- **Behavior:** Choose quality settings for the selected encoder rather than copying x264 CRF settings.
- **Tool:** In WSL, test Linux GPU access; if unavailable, test Windows `ffmpeg.exe` through interop, particularly for AMD.
- **Tool:** Use Windows-accessible file paths with Windows FFmpeg.
- **Tool:** On native Linux, select a working driver/backend rather than assuming the Windows AMF path applies.
- **Behavior:** Benchmark a source segment with the intended crops, filters, and simultaneous outputs.
- **Behavior:** Inspect text and motion quality before the full export.
- **Behavior:** Preserve source timestamps unless timing changes are requested.

## Psychopomp

- **Tool:** Load `psychopomp` for its rendering workflow.
- **Behavior:** Check the render's `GPU:` line for the intended hardware adapter and backend; successful rendering alone does not exclude software fallback.
- **Tool:** In WSL, if the default backend fails or selects software, test Mesa Dozen's Vulkan path when installed.
- **Behavior:** Discover local paths and adapter names from installed ICD manifests and GPU/backend diagnostics rather than copying another computer's settings.
- **Tool:** For the WSL Dozen path, set `VK_ICD_FILENAMES` to the discovered Dozen ICD, `WGPU_BACKEND=vulkan`, `LD_LIBRARY_PATH` to the WSL driver libraries, and `MESA_D3D12_DEFAULT_ADAPTER_NAME` to a substring of the detected GPU name.
- **Tool:** Set `WGPU_ALLOW_UNDERLYING_NONCOMPLIANT_ADAPTER=1` only when required by the selected Dozen path.
- **Behavior:** Before continuing with Dozen, verify the render reports the intended `Microsoft Direct3D12 (...)` adapter and Vulkan.
- **Fact:** Psychopomp rendering overrides are separate from FFmpeg NVENC/AMF settings.

## fframes

- **Tool:** Load `fframes-video` for its rendering workflow.
- **Tool:** Use its GPU rendering backend when supported.
- **Behavior:** Verify the actual backend with a short render.
- **Tool:** Select video encoding separately according to the tool's available options.
