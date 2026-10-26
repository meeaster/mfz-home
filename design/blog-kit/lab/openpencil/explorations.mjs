// Builds the Explorations page JSX for OpenPencil's render tool; writes the args JSON to argv[2].
import { writeFileSync } from 'node:fs';

const v = (name) => `bind={{ "fills/0/color": designVar("color/${name}") }}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
const text = (s, { size = 13, color = 'fg', w = 'fill', weight, font = 'Segoe UI', lh } = {}) =>
  `<Text w=${typeof w === 'number' ? `{${w}}` : `"${w}"`} size={${size}} font="${font}"${weight ? ` weight="${weight}"` : ''}${lh ? ` lineHeight={${lh}}` : ''} ${v(color)}>${esc(s)}</Text>`;
const img = (name, w, h) => `<Rectangle name="img/${name}" w={${w}} h={${h}} rounded={10} fill="#21222C" ${v('surface')} />`;
const verdict = (kind, s) => {
  const [label, color] = kind === 'chosen' ? ['Chosen', 'ok'] : kind === 'no' ? ['Not chosen', 'muted'] : ['Note', 'muted'];
  return `<Text w="fill" size={13} font="Segoe UI" lineHeight={19} ${v('fg')}><Span weight="bold" color="${color === 'ok' ? '#50FA7B' : '#A3A8C3'}">${label} · </Span>${esc(s)}</Text>`;
};
const section = (eyebrow, title, intro, body) => `
<Frame name="Section / ${esc(title)}" flex="col" w="fill" gap={20}>
  <Frame flex="col" w="fill" gap={6}>
    <Text size={12} font="Segoe UI" weight="bold" letterSpacing={1.2} textCase="upper" ${v('accent')}>${esc(eyebrow)}</Text>
    <Text size={26} font="Palatino Linotype" weight="bold" ${v('fg')}>${esc(title)}</Text>
    ${text(intro, { size: 15, color: 'muted', w: 1100, lh: 22 })}
  </Frame>
  ${body}
</Frame>`;
const card = (w, title, image, lines) => `
<Frame flex="col" w={${w}} gap={8}>
  ${text(title, { size: 15, weight: 'bold' })}
  ${image}
  ${lines.join('\n  ')}
</Frame>`;
const row = (cards) => `<Frame flex="row" w="fill" gap={28} wrap rowGap={28}>${cards.join('')}</Frame>`;

const scale = (w, h, to) => [to, Math.round((h * to) / w)];
const R = { r1: [780, 1275], r2: [780, 1629], r3: [780, 2806], r4: [780, 1813] };
const roundCard = (k, title, lines) => card(420, title, img(k, ...scale(...R[k], 420)), lines);

// Paper: the same pen-drawn sequence on each spacing; images are baked vectors from explorations/dots/.
const paper = section('Paper', 'Dot spacing', 'Mark moved the default paper from the 16px grid to dots on 2026-10-25, once the pen was in, and chose 24px from these spacings. The same sequence diagram, drawn by the pen, on each paper; dots are 1px, muted at 32%.', row([
  card(400, 'Grid · 16px', img('grid-16', 400, 281), [verdict('no', 'The default until 2026-10-25; Mark prefers dots.')]),
  ...[12, 16, 20, 24, 28, 32].map((n) => card(400, `Dots · ${n}px`, img(`dots-${n}`, 400, 281), [n === 24 ? verdict('chosen', 'The default paper.') : verdict('no', 'Not chosen.')])),
]));

const jsx = `
<Frame name="Explorations" flex="col" w={1880} p={48} gap={56} fill="#282A36" ${v('bg')}>
  <Frame name="Header" flex="col" w="fill" gap={10}>
    <Text size={12} font="Segoe UI" weight="bold" letterSpacing={1.2} textCase="upper" ${v('accent')}>Technical blog kit</Text>
    <Text size={44} font="Palatino Linotype" weight="bold" ${v('fg')}>Explorations</Text>
    ${text('Every option tried while deciding the diagram system, with the verdict and its reason. The Diagrams page holds what was decided; this page keeps why, so a later change can see what was already ruled out. All examples are real Pele renders of the same OPW diagram.', { size: 17, color: 'muted', w: 1100, font: 'Palatino Linotype', lh: 26 })}
  </Frame>
${section('Drawing style', 'Four rounds of style', 'Each round rendered the same diagram in several styles, under the Dracula theme. The house style came out of round 3: B1 boxes with C1 loops, on the round 4 grid paper.', row([
  roundCard('r1', 'Round 1 · sticker, annotated, neon, sketch-lite', [
    verdict('note', 'Sticker and annotated were liked, especially emphasis picked out in colour. Asked for more variations at different levels of creativity.'),
  ]),
  roundCard('r2', 'Round 2 · pastel, notebook, washi tape, layered paper, zine', [
    verdict('no', 'Soft pastel: boxes without edges in that colour look wrong.'),
    verdict('note', 'Notebook: dot grid and lowercase handwritten outside labels kept; the yellow highlighter is too quirky.'),
    verdict('no', 'Washi tape: too much for work.'),
    verdict('no', 'Layered paper: interesting, not wanted.'),
    verdict('no', 'Zine: too quirky.'),
  ]),
  roundCard('r3', 'Round 3 · whiteboard ink, studio grid, lasso', [
    verdict('chosen', 'B1 flat precise boxes, with C1 loose marker loops for groups.'),
    verdict('no', 'A2 double stroke: reads the same as a single stroke.'),
    verdict('no', 'A3 and C3 washes: better without the wash.'),
    verdict('no', 'B2 sticker shadow and B3 paper stack: no shadows of any kind.'),
    verdict('no', 'Dashed group outlines get lost on the grid; boxes in their group colour look strange, which led to the colour system.'),
  ]),
  roundCard('r4', 'Round 4 · paper, with the colour system', [
    verdict('chosen', 'Grid 16px as the default paper; dots 24px as the alternative; plain allowed. Later replaced by 24px dots as the default (see Dot spacing).'),
    verdict('note', 'Groups take cyan, then purple, then yellow on loops only; the box inside stays neutral; pink marks the one focal box.'),
  ]),
]))}
${paper}
${section('Icons', 'Icon treatments', 'Coloured icons looked wrong, and full-colour logos brought their own colours into the system: GitHub\'s black vanished and Datadog\'s purple collided with the purple group. Every option below keeps icons uncoloured.', `
<Frame flex="col" w="fill" gap={28}>
${row([
  card(420, 'A1 · Icons never coloured', img('a-plain', 420, 279), [verdict('no', 'Plain marks: knockout logos such as Datadog\'s read poorly on dark.')]),
  card(420, 'A2 · Every icon inverted, box kept', img('a-tile', 420, 279), [verdict('chosen', 'Dark mark on a light tile inside the service box, name beneath; the box carries emphasis.')]),
  card(420, 'A3 · Inverted tile is the node, no box', img('a-tile-nobox', 420, 279), [verdict('no', 'Without a box there is nothing to highlight.')]),
  card(420, 'A4 · Bare icon, no box, no tile', img('a-plain-nobox', 420, 279), [verdict('no', 'Nothing to highlight, and knockout logos lose their shape.')]),
])}
${row([
  card(560, 'S1 · Icon beside the name', img('s-beside', 560, 356), [verdict('chosen', 'Tile left of the name inside the participant box.')]),
  card(560, 'S2 · Icon above the name, no box', img('s-stacked', 560, 377), [verdict('no', 'Without a box there is nothing to highlight.')]),
  card(560, 'S3 · Corner badge', img('s-badge', 560, 356), [verdict('no', 'Not chosen.')]),
])}
${row([
  card(560, 'Architecture · before', img('arch-mono', 560, 368), [verdict('no', 'Monochrome marks straight in the box: the focal icon took the pink, and Datadog\'s knockout logo reads as a smudge.')]),
  card(560, 'Architecture · after', img('arch-tiled', 560, 368), [verdict('chosen', 'Real brand icons on tiles; subtitles dropped where the icon says it.')]),
])}
</Frame>`)}
${section('Ruled out', 'Everything else that was tried', 'Options without their own picture above. Reasons are the human\'s, as given.', `
<Frame flex="col" w={1100} gap={10}>
  ${[
    ['Blueprint', 'no personality.'],
    ['Any shadow', 'disliked, in every form tried (sticker, offset, paper stack).'],
    ['Yellow highlighter focal', 'too quirky; pink stays the only emphasis.'],
    ['Item colour = group colour', 'strange when a group and everything in it share a colour.'],
    ['Coloured icons', 'a pink OPW icon looked terrible; icons are never coloured.'],
    ['Full-colour brand logos', 'fight the colour system.'],
    ['Fixed top-left group labels', 'made one diagram worse; labels now go where no line enters.'],
    ['Red for an option not taken', '"not used" is not a status; it is neutral and dashed.'],
  ].map(([a, b]) => `<Text w="fill" size={14} font="Segoe UI" lineHeight={21} ${v('fg')}><Span weight="bold">${esc(a)}: </Span>${esc(b)}</Text>`).join('\n  ')}
</Frame>`)}
</Frame>`;

// SECTION=paper writes only the Dot spacing section, to add it to the page without rebuilding the rest.
const only = process.env.SECTION === 'paper' ? paper : null;
writeFileSync(process.argv[2], JSON.stringify({ jsx: only ?? jsx, x: 0, y: only ? -3000 : 0, ...(process.argv[3] && { replace_id: process.argv[3] }) }));
