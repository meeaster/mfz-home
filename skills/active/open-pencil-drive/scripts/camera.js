// Smooth OpenPencil camera moves: eased wheel events on the canvas, one per animation frame.
// Run with: agent-browser eval "($(cat camera.js))([...steps])" — resolves when the last step ends.
//   {ms}                     hold
//   {ms, zoom, at: [x, y]}   multiply the zoom around a CSS-pixel point (default: canvas centre)
//   {ms, dx, dy}             pan, in wheel units (about 2 CSS px each)
// Measured on OpenPencil 0.16.0-beta.3: ctrl-wheel deltaY d zooms by exp(-0.0139 d), negative zooms in.
// Single events beyond about ±40 follow a different rule, so motion stays in small per-frame steps.
(steps) => new Promise((resolve) => {
  const canvas = [...document.querySelectorAll("canvas")].at(-1);
  const box = canvas.getBoundingClientRect();
  const centre = [box.left + box.width / 2, box.top + box.height / 2];
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const wheel = (init) => canvas.dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init }));
  let i = 0, start = null, prev = 0;
  const frame = (now) => {
    const s = steps[i];
    if (!s) return resolve(`done ${steps.length} steps`);
    start ??= now;
    const t = Math.min(1, (now - start) / s.ms), e = ease(t), de = e - prev;
    prev = e;
    const [x, y] = s.at ?? centre;
    if (s.zoom) wheel({ clientX: x, clientY: y, ctrlKey: true, deltaY: (-Math.log(s.zoom) / 0.0139) * de });
    else if (s.dx || s.dy) wheel({ clientX: x, clientY: y, deltaX: (s.dx ?? 0) * de, deltaY: (s.dy ?? 0) * de });
    if (t >= 1) { i++; start = null; prev = 0; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})
