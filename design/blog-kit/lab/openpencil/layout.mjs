// Builds the "Article layout" page in the running OpenPencil app: how an article's page is laid out, as
// principles and rules, a measured anatomy (vectors, from layout-anatomy.mjs) and examples captured from a
// real article (layout-shots.mjs). Run those two first. Usage: node layout.mjs [replace-frame-id]
// Writing style is not on this page; it lives in the skill's references/explanation-style.md.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const here = new URL('.', import.meta.url).pathname;
const shots = `${here}../../layout/`;
const op = (args, input) => execFileSync('openpencil', args, { encoding: 'utf8', maxBuffer: 64 << 20, input });
const tool = (name, args, pageId) => {
  const f = join(mkdtempSync(join(tmpdir(), 'layout-')), 'args.json');
  writeFileSync(f, JSON.stringify(args));
  return JSON.parse(op(['tool', 'call', name, '--args-file', f, ...(pageId ? ['--page-id', pageId] : []), '--json']));
};
const evalOn = (pageId, code) => JSON.parse(op(['eval', '--stdin', '--page-id', pageId, '--json'], code));

// Helpers in the Explorations page's style.
const v = (name) => `bind={{ "fills/0/color": designVar("color/${name}") }}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
const text = (s, { size = 14, color = 'fg', w = 'fill', weight, lh } = {}) =>
  `<Text w=${typeof w === 'number' ? `{${w}}` : `"${w}"`} size={${size}} font="Segoe UI"${weight ? ` weight="${weight}"` : ''}${lh ? ` lineHeight={${lh}}` : ''} ${v(color)}>${esc(s)}</Text>`;
const px = (file) => { const b = readFileSync(`${shots}${file}`); return [b.readUInt32BE(16) / 2, b.readUInt32BE(20) / 2]; };
// An image slot, filled after rendering; shots are 2x, so they show at half their pixel size, scaled to fit w.
const img = (file, w) => { const [iw, ih] = px(file); const s = Math.min(1, w / iw); return `<Rectangle name="img/${file}" w={${Math.round(iw * s)}} h={${Math.round(ih * s)}} rounded={10} fill="#21222C" />`; };
const slot = (name, w, h) => `<Rectangle name="${name}" w={${w}} h={${h}} fill="#21222C" />`;
const section = (eyebrow, title, intro, body) => `
<Frame name="Section / ${esc(title)}" flex="col" w="fill" gap={20}>
  <Frame flex="col" w="fill" gap={6}>
    <Text size={12} font="Segoe UI" weight="bold" letterSpacing={1.2} textCase="upper" ${v('accent')}>${esc(eyebrow)}</Text>
    <Text size={26} font="Palatino Linotype" weight="bold" ${v('fg')}>${esc(title)}</Text>
    ${intro ? text(intro, { size: 15, color: 'muted', w: 1100, lh: 22 }) : ''}
  </Frame>
  ${body}
</Frame>`;
const figure = (w, image, caption) => `<Frame flex="col" w={${w}} gap={8}>${image}${caption ? text(caption, { size: 13, color: 'muted', lh: 19 }) : ''}</Frame>`;
const row = (items, gap = 32) => `<Frame flex="row" w="fill" gap={${gap}} wrap rowGap={28}>${items.join('')}</Frame>`;
const bullets = (items, w = 'fill') => `<Frame flex="col" w=${typeof w === 'number' ? `{${w}}` : `"${w}"`} gap={10}>${items.map((s) => `<Frame flex="row" w="fill" gap={10}><Text size={14} font="Segoe UI" ${v('accent')}>•</Text>${text(s, { size: 14, lh: 21 })}</Frame>`).join('')}</Frame>`;
const numbered = (items, w) => `<Frame flex="col" w={${w}} gap={12}>${items.map((s, i) => `<Frame flex="row" w="fill" gap={10}><Frame w={22} h={22} rounded={11} fill="#FFB86C" flex="row" justify="center" align="center"><Text size={12} font="Segoe UI" weight="bold" color="#282A36">${i + 1}</Text></Frame>${text(s, { size: 14, lh: 21 })}</Frame>`).join('')}</Frame>`;
const card = (title, body) => `<Frame flex="col" w="fill" gap={10} p={20} rounded={12} fill="#21222C" ${v('surface')}><Text size={13} font="Segoe UI" weight="bold" letterSpacing={1} textCase="upper" ${v('muted')}>${esc(title)}</Text>${body}</Frame>`;

const principles = [
  ['Text fills the column.', 'Paragraphs, headings and lists use the full content width. A narrow text column beside wide components looks pinched.'],
  ['Components are set in and sized to their content.', 'Code, tables and callouts sit a tab in from the text. A repo card or a diagram doesn\'t stretch: the extra width would only be empty space inside its frame.'],
  ['Components and diagrams are centred.', 'Inset components and figures share one centre line with the text.'],
  ['Use the width for content, not margins.', 'When a diagram is narrow and tall, the text that explains it goes beside it.'],
];
const rules = [
  'One column on a phone. From 1100px, one content column of min(1040px, 100vw − 352px), which leaves room for the contents list and changes smoothly.',
  'Code, diffs, tables, callouts and disclosures are inset 48px (one tab) from the text on each side.',
  'A diagram-only figure is as wide as its diagram, centred, never upscaled; its caption takes its width. The diagram with terms is inset-wide, so its term groups have room.',
  'A diagram narrower than about half the column takes its text beside it, 36px away, vertically centred.',
  'From 1200px a sticky contents list sits in the left margin: plain links, with the section in view marked when JavaScript runs.',
  'Repo cards: three across as vertical cards; repository colour on names, dots and chips, never as a side strip.',
  'File pills name the lines they mean and open the file in a viewer; without JavaScript they link to the file\'s row in the index.',
  'A claim that rests on a vendor page links it at the claim: the source\'s mark, the words with a dotted underline, ↗; checked to say what the sentence claims. No closing sources list or footer.',
  'Check at 1280, 1440 and 1920 and at 390: diagrams at full scale, nothing under the contents list, no horizontal scroll.',
];

const jsx = `
<Frame name="Article layout" flex="col" w={1880} p={48} gap={56} fill="#282A36" ${v('bg')}>
  <Frame name="Header" flex="col" w="fill" gap={10}>
    <Text size={12} font="Segoe UI" weight="bold" letterSpacing={1.2} textCase="upper" ${v('accent')}>Technical blog kit</Text>
    <Text size={44} font="Palatino Linotype" weight="bold" ${v('fg')}>Article layout</Text>
    ${text('How an article\'s page is laid out: what sits where, how wide each thing is, and how components and diagrams sit with the text. Diagrams themselves have their own page; writing style lives in the skill\'s explanation-style reference. Examples are captured from a real article (the OPW dev-core walkthrough).', { size: 15, color: 'muted', w: 1100, lh: 22 })}
  </Frame>
${section('Principles and rules', 'Text fills, components sit in', 'Principles say why and take judgement. Rules say what and can be checked; when a rule doesn\'t cover a case, fall back to the principle behind it.', row([
  `<Frame flex="col" w={820} gap={16}>${principles.map(([t, d], i) => `<Frame flex="col" w="fill" gap={4}><Text size={16} font="Segoe UI" weight="bold" ${v('fg')}>${i + 1}. ${esc(t)}</Text>${text(d, { size: 14, color: 'muted', lh: 21 })}</Frame>`).join('')}</Frame>`,
  `<Frame flex="col" w={900} gap={10}>${card('Rules', bullets(rules))}</Frame>`,
]))}
${section('Desktop', 'The desktop column', 'A 1440px viewport, measured. The orange bands are measurements laid over the page, not part of it.', row([
  figure(900, slot('svg/layout-anatomy', 900, 781), 'Schematic of an article at 1440px. Numbers match the list.'),
  `<Frame flex="col" w={820} gap={20}>${numbered([
    'Text fills the content column: 1040px at 1440 (min(1040px, 100vw − 352px)).',
    'Code, tables, callouts and disclosures sit one tab (48px) in from the text on each side.',
    'The contents list sits in the left margin from 1200px, clear of the column.',
    'A diagram figure is as wide as its diagram and centred: equal space each side.',
    'A narrow diagram\'s text goes beside it, 36px away.',
    'Repo cards stand side by side in an inset row.',
  ], 820)}${figure(820, img('desktop-frame.png', 820), 'In the article at 1440px: the contents list, text across the column, an inset table.')}</Frame>`,
]))}
${section('Components', 'Set in, sized to content', 'A component only takes the width it uses. Code fills the inset width because its lines are long; a diagram\'s frame stops at the diagram.', row([
  figure(860, img('sized-figure.png', 860), 'A diagram-only figure hugs its diagram and is centred; the code below fills the inset width.'),
  figure(860, img('terms-figure.png', 860), 'The diagram with terms is inset-wide: the diagram sits centred on its paper and the three term groups get the room.'),
]))}
${section('Components', 'Repo cards, side by side', 'The repositories a walkthrough touches, introduced once near the top: three vertical cards in an inset row. Branch and diff size line up along the bottom of every card. A draft that was never pushed says so on its own line and links the repository, not a compare view.', row([
  figure(1104, img('repo-cards.png', 1104)),
  `<Frame flex="col" w={600} gap={10}>${bullets(['Owner and visibility on the first line, the name beneath.', 'What the repository adds to the change, in one line.', 'Repository colour on the branch chip and dots, never as a side strip.', 'Below 1100px the cards stack horizontally.'])}</Frame>`,
]))}
${section('Layout', 'Text beside a narrow diagram', 'When a diagram is narrower than about half the column and its text maps onto it, the text goes beside it: here, the five steps beside the order-of-work flow. It stacks below 1100px.', row([figure(1104, img('beside.png', 1104))]))}
${section('Walkthroughs', 'Every changed file', 'The article ends with an index of every changed file, grouped the way the article is organised: where everything plugs in, each need, then plumbing. Each row says why the file exists and opens to its code.', row([
  figure(1000, img('file-index.png', 1000)),
  `<Frame flex="col" w={700} gap={10}>${bullets(['File, repository, one line on why it exists, the needs it serves, and its size.', 'New files open in full; modified files show their diff.', 'The reasons are written by hand; keep them true to the diffs.', 'Chosen over a GitHub-style "Files changed" list and a two-pane browser (see Explorations).'])}</Frame>`,
]))}
${section('Interaction', 'File pills and the viewer', 'A pill names a file in running text and the lines the sentence is about (pink). Clicking it opens the file in a viewer, with those lines highlighted and scrolled into view; modified files have Changes and Whole file tabs. Without JavaScript the pill links to the file\'s row in the index.', row([
  figure(860, img('pills.png', 860), 'Pills in a table, each naming its lines.'),
  figure(860, img('viewer.png', 860), 'The viewer, opened from agent-nlb.yaml L13, 16, 20–21.'),
]))}
${section('Phone', 'On a phone', 'One column. Components go full width, diagrams switch to their narrow variant, the contents list is hidden, and the viewer stacks its header.', row([
  figure(300, img('phone-top.png', 300), 'The opening.'),
  figure(300, img('phone-terms.png', 300), 'The diagram with terms: narrow diagram, groups stacked.'),
  figure(300, img('phone-viewer.png', 300), 'The viewer on a diff, line 261 highlighted.'),
], 40))}
</Frame>`;

// The page: create it once, then render (or replace the previous render).
const pages = tool('list_pages', {}).pages;
let page = pages.find((p) => p.name === 'Article layout');
if (!page) page = tool('create_page', { name: 'Article layout' });
const pageId = page.id;
const rendered = tool('render', { jsx, x: 0, y: 0, ...(process.argv[2] && { replace_id: process.argv[2] }) }, pageId);
console.log('rendered', rendered.id, 'on', pageId);

// Fill each image slot with its shot.
const slots = evalOn(pageId, `JSON.stringify(figma.getNodeById(${JSON.stringify(rendered.id)}).findAll((n) => n.name.startsWith('img/')).map((n) => [n.id, n.name.slice(4)]))`);
for (const [id, file] of JSON.parse(slots)) {
  const b64 = readFileSync(`${shots}${file}`).toString('base64');
  evalOn(pageId, `const n = figma.getNodeById(${JSON.stringify(id)}); const img = figma.createImage(figma.base64Decode(${JSON.stringify(b64)}));
    n.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FIT' }]; 1`);
  console.log('filled', file);
}
// The anatomy goes in as editable vectors, scaled into its slot.
const anat = JSON.parse(evalOn(pageId, `JSON.stringify(figma.getNodeById(${JSON.stringify(rendered.id)}).findOne((n) => n.name === 'svg/layout-anatomy').id)`));
console.log(execFileSync('node', [`${here}../swap.mjs`, `${here}../../svg/layout-anatomy.svg`, anat, 'diagram/layout-anatomy', pageId], { encoding: 'utf8' }).trim().split('\n').pop());
