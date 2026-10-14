# Synchronized recording of several apps

Record several apps side by side as one whole-monitor take, then crop each app out in editing. A single capture keeps every app on the same clock, so an action in one and its effect in the others land on the same frame; separate captures would need lining up afterwards, and CDP recordings of the extra apps run at a third of ddagrab's frame rate.

Every window has to stay visible and uncovered for the whole take, since ddagrab films the screen.

## Plan the grid

On a 3840×2160 monitor a 2×2 grid gives each cell about 1920×1050 physical pixels: almost exactly a 1080p frame, so a cropped cell fills a 1080p edit without upscaling. Give every app the same cell size so the crops match; leave an unused cell as whatever is behind (it's cropped away), or put a fourth app there.

## Choose the display scaling

Scaling decides how many CSS pixels or terminal cells fit in a cell, so it decides which layout each app shows. At 4K, a 1920-pixel cell is 1920 ÷ scale CSS pixels wide:

| Scaling | Cell width in CSS px |
| --- | --- |
| 125% | 1536 |
| 150% | 1280 |
| 175% | about 1097 |
| 250% | 768 |

1. Find each app's layout thresholds: CSS breakpoints in the web app's stylesheets (`@media (width>=…)`), or a terminal app's column count for optional panes. For example, OpenCode's web UI switches to a phone layout below 768 CSS px, and its TUI shows its sidebar from about 120 columns.
2. Pick the highest scaling at which every app shows the layout you want: higher scaling means larger text in the recording. When the final video is 1080p, any scaling down to 125% still reads normally once a cell is cropped to fill the frame. When it's 4K, a cropped cell is upscaled, so prefer the higher scaling.
3. Record the user's current scaling, then set the new one: `scripts/display-scale.ps1 -Set <percent>`. It changes immediately (no sign-out) and prints the new work area in physical pixels, which the grid uses.

Done when a still of the arranged screen shows every app in its intended layout.

## Quiet the desktop

- **HDR off.** With Windows HDR on, ddagrab's 8-bit capture crushes the dark shades of ordinary content: a background Chrome draws as RGB (21, 23, 32) was recorded as (6, 7, 11). `scripts/display-hdr.ps1` reports the state; `-Set off` switches it, `-Set on` restores it.
- **Notifications off.** Toasts land in the recording. Turn off the global switch and delete the value afterwards to restore the default:
  ```powershell
  Set-ItemProperty HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings NOC_GLOBAL_SETTING_TOASTS_ENABLED 0 -Type DWord
  Remove-ItemProperty HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings NOC_GLOBAL_SETTING_TOASTS_ENABLED
  ```
- **In-page permission prompts.** A web app asking to show notifications covers part of its own cell. Over the browser's CDP connection, `Browser.setPermission` with `{permission: {name: "notifications"}, setting: "denied", origin: "<app origin>"}` stops the prompt for that site.

These change the user's machine: tell the user what you switched, keep the original values, and restore them when they're finished recording.

## Arrange and check

- Place each window with `scripts/place-window.ps1 -Name <Process> [-Title T | -TitlePrefix P] -X -Y -W -H`, in physical pixels from the work area. It brings the window to the front, so place them in an order where none covers another.
- Terminal apps reflow to the new size; confirm with `termctrl list` that the column count crossed any threshold you planned for.
- Take a still before recording and look at it:
  ```bash
  (cd /mnt/c && "$WINDOWS_FFMPEG" -hide_banner -loglevel error -y -filter_complex "ddagrab=framerate=5,hwdownload,format=bgra" -frames:v 1 "<Windows path>\\still.png")
  ```
  Check that every app shows the intended layout, nothing overlaps, and no prompt or toast is on screen.

## Record and drive

Record the whole monitor without the pointer: `scripts/record-window.sh start screen <out.mp4> --screen --no-mouse`. With `--screen`, `start` records even when Windows won't hand focus to a window. Drive one app (for a TUI, `termctrl send --pace-ms 35` so the typing reads as human), wait until every app shows the result, then stop.

## Crop in editing

Keep the whole-monitor take as the original. Crop a cell with its frame from `place-window.ps1`, for example the top-right cell of a 2×2 grid at 125%:

```bash
ffmpeg -i take.mp4 -vf "crop=1920:1050:1920:0" -c:v libx264 -crf 18 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 cell.mp4
```

Zooming in further than one cell per output frame upscales the text; at that point a higher scaling for the take is the better fix.
