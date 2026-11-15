/* Grafik SVG ringan, tanpa library luar */
window.Charts = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  const tipEl = function () { return document.getElementById('chartTip'); };
  const css = function (name, fb) { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; };

  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function niceStep(max, count) {
    if (max <= 0) return 1;
    const raw = max / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return s * mag;
  }

  function showTip(html, x, y) {
    const t = tipEl();
    t.innerHTML = html;
    t.hidden = false;
    const w = t.offsetWidth;
    const cx = Math.min(Math.max(x, w / 2 + 8), window.innerWidth - w / 2 - 8);
    t.style.left = cx + 'px';
    t.style.top = Math.max(y, t.offsetHeight + 20) + 'px';
  }
  function hideTip() { const t = tipEl(); if (t) t.hidden = true; }
  document.addEventListener('scroll', hideTip, { passive: true, capture: true });
  document.addEventListener('pointerdown', function (e) {
    if (!e.target.closest || !e.target.closest('.chart')) hideTip();
  });

  function roundTopPath(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, w / 2, h);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }

  function axes(svg, o) {
    const g = el('g', {}, svg);
    for (let v = 0; v <= o.max + 1e-9; v += o.step) {
      const y = o.y(v);
      el('line', { x1: o.left, x2: o.right, y1: y, y2: y, stroke: v === 0 ? css('--chart-axis', '#c9cedb') : css('--chart-grid', '#eceef4'), 'stroke-width': 1 }, g);
      const t = el('text', { x: o.left - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: css('--ink-3', '#8a92a6') }, g);
      t.textContent = o.fmtAxis(v);
    }
  }

  /** Grafik garis dengan crosshair + tooltip. points: [{label, tip, value}] */
  function line(container, points, opts) {
    container.innerHTML = '';
    const W = Math.max(container.clientWidth || 320, 260);
    const H = 200, L = 48, R = 10, T = 12, B = 28;
    const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.ariaLabel || '' }, container);
    const maxV = Math.max.apply(null, points.map(function (p) { return p.value; }).concat([0]));
    const step = niceStep(maxV || 1, 3);
    const max = Math.max(step * Math.ceil((maxV || 1) / step), step);
    const n = points.length;
    const x = function (i) { return n <= 1 ? (L + W - R) / 2 : L + (i * (W - R - L)) / (n - 1); };
    const y = function (v) { return T + (H - T - B) * (1 - v / max); };
    axes(svg, { max: max, step: step, y: y, left: L, right: W - R, fmtAxis: opts.fmtAxis });

    // label sumbu-x (maks ~5)
    const every = Math.max(1, Math.ceil(n / 5));
    points.forEach(function (p, i) {
      if (i % every !== 0 && i !== n - 1) return;
      if (i !== n - 1 && n - 1 - i < every * 0.6) return;
      const t = el('text', { x: x(i), y: H - 8, 'text-anchor': i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle', 'font-size': 11, fill: css('--ink-3', '#8a92a6') }, svg);
      t.textContent = p.label;
    });

    const color = opts.color;
    const d = points.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.value).toFixed(1); }).join('');
    const gradId = 'g' + Math.random().toString(36).slice(2, 8);
    const defs = el('defs', {}, svg);
    const lg = el('linearGradient', { id: gradId, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': 0.18 }, lg);
    el('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': 0 }, lg);
    if (n > 1) el('path', { d: d + 'L' + x(n - 1) + ',' + y(0) + 'L' + x(0) + ',' + y(0) + 'Z', fill: 'url(#' + gradId + ')' }, svg);
    el('path', { d: d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    if (n === 1 || n <= 12) points.forEach(function (p, i) { el('circle', { cx: x(i), cy: y(p.value), r: 3, fill: color }, svg); });

    // lapisan interaksi
    const cross = el('line', { y1: T, y2: H - B, stroke: css('--ink-3', '#8a92a6'), 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' }, svg);
    const dot = el('circle', { r: 5.5, fill: color, stroke: css('--paper', '#fff'), 'stroke-width': 2, visibility: 'hidden' }, svg);
    const hit = el('rect', { x: L, y: 0, width: W - L - R, height: H, fill: 'transparent' }, svg);
    function move(ev) {
      const rect = svg.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * W;
      const i = n <= 1 ? 0 : Math.round(((px - L) / (W - R - L)) * (n - 1));
      const k = Math.min(Math.max(i, 0), n - 1);
      const p = points[k];
      cross.setAttribute('x1', x(k)); cross.setAttribute('x2', x(k)); cross.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', x(k)); dot.setAttribute('cy', y(p.value)); dot.setAttribute('visibility', 'visible');
      const sx = rect.left + (x(k) / W) * rect.width;
      const sy = rect.top + (y(p.value) / H) * rect.height;
      showTip('<div>' + p.tip + '</div><b>' + opts.fmt(p.value) + '</b>', sx, sy);
    }
    function leave() { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); hideTip(); }
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') leave(); });
  }

  /** Batang berkelompok. groups: [{label, tip, values:[a,b]}], series: [{name,color}] */
  function groupBars(container, groups, series, opts) {
    container.innerHTML = '';
    const W = Math.max(container.clientWidth || 320, 260);
    const H = 210, L = 48, R = 6, T = 12, B = 28;
    const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.ariaLabel || '' }, container);
    const maxV = Math.max.apply(null, groups.map(function (g) { return Math.max.apply(null, g.values); }).concat([0]));
    const step = niceStep(maxV || 1, 3);
    const max = Math.max(step * Math.ceil((maxV || 1) / step), step);
    const y = function (v) { return T + (H - T - B) * (1 - v / max); };
    axes(svg, { max: max, step: step, y: y, left: L, right: W - R, fmtAxis: opts.fmtAxis });

    const slot = (W - L - R) / groups.length;
    const bw = Math.min(22, (slot * 0.62 - 2) / series.length);
    groups.forEach(function (g, gi) {
      const cx = L + slot * gi + slot / 2;
      const total = bw * series.length + 2 * (series.length - 1);
      const sel = el('rect', { x: L + slot * gi + 2, y: T - 4, width: slot - 4, height: H - B - T + 4, rx: 8, fill: css('--track', '#f3f5fa'), visibility: 'hidden' }, svg);
      g.values.forEach(function (v, si) {
        const bx = cx - total / 2 + si * (bw + 2);
        const p = roundTopPath(bx, y(v), bw, y(0) - y(v), 4);
        if (p) el('path', { d: p, fill: series[si].color }, svg);
      });
      const t = el('text', { x: cx, y: H - 8, 'text-anchor': 'middle', 'font-size': 11, fill: css('--ink-3', '#8a92a6') }, svg);
      t.textContent = g.label;
      const hit = el('rect', { x: L + slot * gi, y: 0, width: slot, height: H, fill: 'transparent' }, svg);
      function on() {
        svg.querySelectorAll('rect[data-sel]').forEach(function (r) { r.setAttribute('visibility', 'hidden'); });
        sel.setAttribute('data-sel', 1); sel.setAttribute('visibility', 'visible');
        const rect = svg.getBoundingClientRect();
        const top = y(Math.max.apply(null, g.values));
        const rows = series.map(function (s, si) {
          return '<div class="row"><i class="dot" style="background:' + s.color + '"></i>' + s.name + ': <b>' + opts.fmt(g.values[si]) + '</b></div>';
        }).join('');
        showTip('<div>' + g.tip + '</div>' + rows, rect.left + (cx / W) * rect.width, rect.top + (top / H) * rect.height);
      }
      hit.addEventListener('pointerenter', on);
      hit.addEventListener('pointerdown', on);
      hit.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { sel.setAttribute('visibility', 'hidden'); hideTip(); } });
    });
  }

  return { line: line, groupBars: groupBars, hideTip: hideTip };
})();
