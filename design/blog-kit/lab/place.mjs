// Imports a baked SVG into the running OpenPencil app as editable layers, then restores the dashes the importer drops.
// Usage: node place.mjs <baked.svg> <layer-name> <page-id> <x> <y> [replace-node-id]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [file, name, pageId, x, y, replace] = process.argv.slice(2);
const op = (...args) => execFileSync('openpencil', [...args, '--page-id', pageId, '--json'], { encoding: 'utf8', maxBuffer: 64 << 20 });

if (replace) op('tool', 'call', 'delete_node', '--args', JSON.stringify({ id: replace }));
// Arguments go through a file: an SVG is too long for a command line, and --args-file - does not read stdin.
const argsFile = join(mkdtempSync(join(tmpdir(), 'place-')), 'args.json');
writeFileSync(argsFile, JSON.stringify({ svg: readFileSync(file, 'utf8'), name, x: +x, y: +y }));
const { id } = JSON.parse(op('tool', 'call', 'import_svg', '--args-file', argsFile));

const code = `
const root = figma.getNodeById(${JSON.stringify(id)});
// The importer gives the frame a white fill, which shows at the paper's rounded corners.
root.fills = [];
let n = 0;
for (const node of root.findAll((c) => c.name.startsWith('dash_'))) {
  // The canvas draws dashes from each stroke; the node-level dashPattern the plugin API exposes is never rendered (0.16.0).
  const dashPattern = node.name.split('_').slice(1, -1).map(Number);
  node.strokes = node.strokes.map((s) => ({ ...s, dashPattern }));
  n++;
}
n;`;
const dashed = JSON.parse(execFileSync('openpencil', ['eval', '--stdin', '--page-id', pageId, '--json'], { input: code, encoding: 'utf8' }));
console.log(JSON.stringify({ id, name, dashed }));
