// Replaces an image placeholder in the running OpenPencil app with a baked SVG, scaled to the placeholder's width.
// Usage: node swap.mjs <baked.svg> <placeholder-node-id> <layer-name> <page-id>
import { execFileSync } from 'node:child_process';

const [file, placeholder, name, pageId] = process.argv.slice(2);
const placed = JSON.parse(execFileSync('node', [new URL('place.mjs', import.meta.url).pathname, file, name, pageId, '0', '-4000'], { encoding: 'utf8' }));

const code = `
const p = figma.getNodeById(${JSON.stringify(placeholder)});
const s = figma.getNodeById(${JSON.stringify(placed.id)});
const parent = p.parent;
const index = parent.children.indexOf(p);
s.rescale(p.width / s.width);
parent.insertChild(index, s);
p.remove();
[Math.round(s.width), Math.round(s.height)].join('x');`;
const size = JSON.parse(execFileSync('openpencil', ['eval', '--stdin', '--page-id', pageId, '--json'], { input: code, encoding: 'utf8' }));
console.log(JSON.stringify({ ...placed, size }));
