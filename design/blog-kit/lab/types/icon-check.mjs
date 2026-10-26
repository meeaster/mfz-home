// Each brand icon large and small, as drawn (white on dark) and inverted (dark on a light tile).
import { readFile, writeFile } from 'node:fs/promises';
const dir = new URL('.', import.meta.url).pathname;
const si = JSON.parse(await readFile(new URL('../node_modules/@iconify-json/simple-icons/icons.json', import.meta.url)));
const names = ['datadog', 'github', 'amazons3', 'flux', 'awselasticloadbalancing', 'kubernetes', 'amazonwebservices', 'terraform', 'helm'];
const svg = (n, size) => `<svg width="${size}" height="${size}" viewBox="0 0 ${si.icons[n].width ?? si.width ?? 24} ${si.icons[n].height ?? si.height ?? 24}">${si.icons[n].body}</svg>`;
const row = (n) => `<tr><td>${n}</td>
  <td class="normal">${svg(n, 64)}</td><td class="normal">${svg(n, 24)}</td>
  <td><span class="tile big">${svg(n, 48)}</span></td><td><span class="tile">${svg(n, 18)}</span></td></tr>`;
await writeFile(dir + 'icon-check.html', `<!doctype html><meta charset=utf-8><title>Icon check</title><style>
body { margin:0; background:#282a36; color:#f8f8f2; font:14px "Segoe UI",sans-serif; } main { padding:20px; }
table { border-collapse: collapse; } td, th { padding: 10px 18px; border-bottom: 1px solid #44475a; text-align:center; } td:first-child { text-align:left; font-family:"JetBrains Mono"; }
.normal { color:#f8f8f2; } .tile { display:inline-grid; place-items:center; width:28px; height:28px; border-radius:7px; background:#f8f8f2; color:#282a36; }
.tile.big { width:72px; height:72px; border-radius:16px; }
</style><main><table id="t"><tr><th>icon</th><th>as drawn · 64</th><th>as drawn · 24</th><th>inverted tile · 48</th><th>inverted tile · 18</th></tr>${names.map(row).join('')}</table></main>`);
