// Paste into a page (agent-browser eval) to make every display frame different: a full-window canvas with
// a changing color and frame counter. Remove with: document.getElementById("__fps_probe")?.remove()
(() => {
  if (document.getElementById("__fps_probe")) return "already on";
  const c = document.createElement("canvas");
  c.id = "__fps_probe";
  c.width = innerWidth;
  c.height = innerHeight;
  Object.assign(c.style, { position: "fixed", inset: "0", zIndex: 2147483647, pointerEvents: "none" });
  document.body.appendChild(c);
  const g = c.getContext("2d");
  let n = 0;
  (function frame() {
    if (!document.getElementById("__fps_probe")) return;
    n++;
    g.fillStyle = `hsl(${(n * 7) % 360},70%,50%)`;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#fff";
    g.font = "bold 200px sans-serif";
    g.fillText(String(n), 80, 300);
    requestAnimationFrame(frame);
  })();
  return "probe on";
})()
