// Forma da abertura: um retângulo de cantos arredondados que se fecha num hexágono
// de ponta para cima, igual às luzes do teto da DC.
// m = 0 é o retângulo; m = 1 é o hexágono. Coordenadas em pixels.

export function pontos(x, y, w, h, m) {
  const q = h * 0.25 * m;
  return [
    [x, y + q],
    [x + w / 2, y],
    [x + w, y + q],
    [x + w, y + h - q],
    [x + w / 2, y + h],
    [x, y + h - q],
  ];
}

export function caminho(pts, raio) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n];
    const p = pts[i];
    const b = pts[(i + 1) % n];
    const ax = a[0] - p[0], ay = a[1] - p[1];
    const bx = b[0] - p[0], by = b[1] - p[1];
    const la = Math.hypot(ax, ay) || 1;
    const lb = Math.hypot(bx, by) || 1;
    const r = Math.min(raio, la / 2, lb / 2);
    const x1 = p[0] + (ax / la) * r, y1 = p[1] + (ay / la) * r;
    const x2 = p[0] + (bx / lb) * r, y2 = p[1] + (by / lb) * r;
    d += `${i === 0 ? 'M' : 'L'}${x1.toFixed(1)},${y1.toFixed(1)}Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  return d + 'Z';
}

export const forma = (s) => caminho(pontos(s.x, s.y, s.w, s.h, s.m), s.r);
