/* =========================================================
   TEMA TAMPILAN
   Setiap tema cukup ditulis dengan beberapa warna dasar;
   sisanya (warna teks, garis, tombol, grafik) dihitung otomatis
   dan selalu dicek agar kontrasnya tetap terbaca.
   ========================================================= */
window.Themes = (function () {
  'use strict';

  /* ---------- Utilitas warna ---------- */
  function rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2); }).join(''); }
  function mix(a, b, t) { const x = rgb(a), y = rgb(b); return hex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
  function rgba(h, a) { const c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function lum(h) {
    return rgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); })
      .reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  /** Geser warna ke hitam/putih sampai kontras dengan `bg` minimal `ratio`. */
  function fit(c, bg, ratio) {
    const toward = lum(bg) > 0.4 ? '#000000' : '#ffffff';
    let out = c;
    for (let i = 0; i < 30 && contrast(out, bg) < ratio; i++) out = mix(out, toward, 0.07);
    return out;
  }
  function hsl2hex(h, s, l) {
    s /= 100; l /= 100;
    const k = function (n) { return (n + h / 30) % 12; };
    const a = s * Math.min(l, 1 - l);
    const f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return hex([f(0) * 255, f(8) * 255, f(4) * 255]);
  }
  function hex2hsl(h) {
    const c = rgb(h).map(function (v) { return v / 255; });
    const max = Math.max.apply(null, c), min = Math.min.apply(null, c), l = (max + min) / 2;
    let hh = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === c[0]) hh = (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0);
      else if (max === c[1]) hh = (c[2] - c[0]) / d + 2;
      else hh = (c[0] - c[1]) / d + 4;
      hh *= 60;
    }
    return [hh, s * 100, l * 100];
  }

  /* ---------- Motif (SVG 64×64). P = warna utama, S = aksen, D = detail gelap ---------- */
  function petals(n, rx, ry, cy, P) {
    let s = '';
    for (let i = 0; i < n; i++) s += '<ellipse cx="32" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + P + '" transform="rotate(' + (360 / n) * i + ' 32 32)"/>';
    return s;
  }
  const M = {
    gem: function (P, S) { return '<path d="M14 24 23 12h18l9 12-18 30z" fill="' + P + '"/><path d="M14 24h36M23 12l5 12 4 30 4-30 5-12" fill="none" stroke="' + S + '" stroke-width="2" stroke-linejoin="round"/>'; },
    sprout: function (P, S) { return '<circle cx="32" cy="44" r="14" fill="' + P + '"/><circle cx="32" cy="44" r="8.5" fill="none" stroke="' + S + '" stroke-width="2.5"/><rect x="30" y="16" width="4" height="18" rx="2" fill="' + P + '"/><path d="M31 21C28 13 21 9 12 9c2 9 9 13 19 12z" fill="' + P + '"/><path d="M33 19c3-9 10-13 19-14-2 9-9 14-19 14z" fill="' + S + '"/>'; },
    sakura: function (P, S) { return petals(5, 7.5, 12, 19, P) + '<circle cx="32" cy="32" r="4.5" fill="' + S + '"/>'; },
    daisy: function (P, S) { return petals(8, 5, 11, 18, P) + '<circle cx="32" cy="32" r="7" fill="' + S + '"/>'; },
    tennis: function (P, S) { return '<circle cx="32" cy="32" r="20" fill="' + P + '"/><path d="M15 21c9 4 9 18 0 22M49 21c-9 4-9 18 0 22" fill="none" stroke="' + S + '" stroke-width="3" stroke-linecap="round"/>'; },
    dumbbell: function (P, S) { return '<rect x="7" y="22" width="8" height="20" rx="2" fill="' + P + '"/><rect x="15" y="17" width="8" height="30" rx="2" fill="' + P + '"/><rect x="41" y="17" width="8" height="30" rx="2" fill="' + P + '"/><rect x="49" y="22" width="8" height="20" rx="2" fill="' + P + '"/><rect x="23" y="29" width="18" height="6" rx="2" fill="' + S + '"/>'; },
    shuttle: function (P, S) { return '<path d="M21 8h22l-6 32H27z" fill="' + P + '"/><path d="M27 8l2 32M32 8v32M37 8l-2 32" stroke="' + S + '" stroke-width="1.6"/><path d="M26 41h12v3a6 6 0 0 1-12 0z" fill="' + S + '"/>'; },
    ring: function (P, S) { return '<circle cx="32" cy="32" r="18" fill="none" stroke="' + P + '" stroke-width="5"/><rect x="26" y="8" width="12" height="9" rx="3" fill="' + S + '"/><rect x="26" y="47" width="12" height="9" rx="3" fill="' + S + '"/>'; },
    paddle: function (P, S) {
      let h = '';
      [[26, 18], [32, 18], [38, 18], [26, 25], [32, 25], [38, 25], [29, 32], [35, 32]].forEach(function (p) { h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.8" fill="' + S + '"/>'; });
      return '<path d="M32 5c13 0 18 10 18 20 0 12-8 18-18 18s-18-6-18-18C14 15 19 5 32 5z" fill="' + P + '"/><rect x="29" y="42" width="6" height="17" rx="2" fill="' + S + '"/>' + h;
    },
    ball: function (P, S) { return '<circle cx="32" cy="32" r="20" fill="' + P + '"/><path d="M32 24l7.6 5.5-2.9 9h-9.4l-2.9-9z" fill="' + S + '"/><path d="M32 24V13m7.6 16.5L50 26m-13.3 12.5L43 47m-15.7-8.5L21 47m3.4-17.5L14 26" stroke="' + S + '" stroke-width="2"/>'; },
    aurora: function (P, S) { return '<path d="M4 38c12-20 24 4 36-16s18-4 20 0" fill="none" stroke="' + P + '" stroke-width="6" stroke-linecap="round"/><path d="M4 50c14-16 26 4 40-14s14-4 16-2" fill="none" stroke="' + S + '" stroke-width="4" stroke-linecap="round"/>'; },
    leaf: function (P, S) { return '<path d="M12 52c0-26 18-42 42-42 0 24-16 42-42 42z" fill="' + P + '"/><path d="M14 50c12-12 22-22 34-34" stroke="' + S + '" stroke-width="2" fill="none" stroke-linecap="round"/>'; },
    teddy: function (P, S, D) { return '<circle cx="18" cy="19" r="8" fill="' + P + '"/><circle cx="46" cy="19" r="8" fill="' + P + '"/><circle cx="18" cy="19" r="4" fill="' + S + '"/><circle cx="46" cy="19" r="4" fill="' + S + '"/><circle cx="32" cy="34" r="18" fill="' + P + '"/><ellipse cx="32" cy="41" rx="8" ry="6" fill="' + S + '"/><circle cx="25" cy="31" r="2" fill="' + D + '"/><circle cx="39" cy="31" r="2" fill="' + D + '"/><ellipse cx="32" cy="39" rx="2.6" ry="2" fill="' + D + '"/>'; },
    capy: function (P, S, D) { return '<path d="M9 40c0-14 12-20 26-20 10 0 18 6 20 14 2 8-4 14-12 14H17c-5 0-8-3-8-8z" fill="' + P + '"/><ellipse cx="40" cy="21" rx="3.4" ry="2.6" fill="' + S + '"/><circle cx="46" cy="29" r="1.9" fill="' + D + '"/><ellipse cx="53.6" cy="35" rx="1.6" ry="2.2" fill="' + D + '"/><rect x="15" y="45" width="5" height="8" rx="2" fill="' + P + '"/><rect x="37" y="45" width="5" height="8" rx="2" fill="' + P + '"/>'; },
    bunny: function (P, S, D) { return '<ellipse cx="24" cy="17" rx="5" ry="13" fill="' + P + '"/><ellipse cx="40" cy="17" rx="5" ry="13" fill="' + P + '"/><ellipse cx="24" cy="18" rx="2.2" ry="9" fill="' + S + '"/><ellipse cx="40" cy="18" rx="2.2" ry="9" fill="' + S + '"/><ellipse cx="32" cy="40" rx="16" ry="14" fill="' + P + '"/><circle cx="26" cy="38" r="1.9" fill="' + D + '"/><circle cx="38" cy="38" r="1.9" fill="' + D + '"/><circle cx="32" cy="43" r="2" fill="' + S + '"/>'; },
    zebra: function (P) { let s = ''; [0, 21, 42].forEach(function (y) { s += '<path transform="translate(0 ' + y + ')" d="M0 6c14-6 22 8 36 2s22-6 28-2v7c-10-4-16 8-30 4S10 7 0 14z" fill="' + P + '"/>'; }); return s; },
    cow: function (P) { return '<path d="M10 14c4-8 16-6 16 2s-10 10-14 6c-4-2-4-5-2-8zM40 34c6-6 18-2 16 8-2 8-14 10-18 4-3-4-2-8 2-12zM12 46c4-4 10 0 8 4-2 4-8 3-8 0z" fill="' + P + '"/>'; },
    matcha: function (P, S) { return '<path d="M10 32h44c0 12-10 20-22 20S10 44 10 32z" fill="' + P + '"/><ellipse cx="32" cy="32" rx="22" ry="4" fill="' + S + '"/><path d="M26 23c0-8 6-12 12-12 0 8-6 12-12 12z" fill="' + S + '"/>'; },
    coffee: function (P, S) { return '<path d="M14 24h30v16c0 7-6 12-14 12h-2c-8 0-14-5-14-12z" fill="' + P + '"/><path d="M44 28h4c4 0 6 3 6 6 0 4-3 6-7 6h-3" fill="none" stroke="' + P + '" stroke-width="4"/><path d="M22 18c-2-4 2-6 0-10m8 10c-2-4 2-6 0-10m8 10c-2-4 2-6 0-10" stroke="' + S + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>'; },
    books: function (P, S, D) { return '<rect x="10" y="40" width="44" height="10" rx="2" fill="' + P + '"/><rect x="14" y="29" width="38" height="10" rx="2" fill="' + S + '"/><rect x="12" y="18" width="40" height="10" rx="2" fill="' + P + '"/><path d="M16 23h30M18 34h28M14 45h34" stroke="' + D + '" stroke-opacity=".25" stroke-width="1.5"/>'; },
    car: function (P, S, D) { return '<path d="M8 40v-6c0-3 2-4 5-5l7-7c2-2 4-3 7-3h11c3 0 5 1 7 3l6 7c4 1 6 3 6 6v5z" fill="' + P + '"/><path d="M22 28l5-5h8v5zm16-5h2c2 0 3 1 4 2l3 3h-9z" fill="' + S + '"/><circle cx="19" cy="41" r="6" fill="' + D + '"/><circle cx="46" cy="41" r="6" fill="' + D + '"/><circle cx="19" cy="41" r="2.5" fill="' + S + '"/><circle cx="46" cy="41" r="2.5" fill="' + S + '"/>'; },
    cupcake: function (P, S, D) { return '<path d="M16 34h32l-4 20H20z" fill="' + S + '"/><path d="M24 34l2 20m6-20v20m8-20l-2 20" stroke="' + D + '" stroke-opacity=".2" stroke-width="1.5"/><path d="M14 34c-4-8 4-14 10-12 0-8 16-8 16 0 6-2 14 4 10 12z" fill="' + P + '"/><circle cx="32" cy="13" r="4" fill="' + S + '"/>'; },
    sparkle: function (P, S) { return '<path d="M32 6c2 16 10 24 26 26-16 2-24 10-26 26-2-16-10-24-26-26 16-2 24-10 26-26z" fill="' + P + '"/><circle cx="52" cy="12" r="3" fill="' + S + '"/><circle cx="12" cy="52" r="2" fill="' + S + '"/>'; },
    weave: function (P, S) { return '<path d="M0 8h64M0 24h64M0 40h64M0 56h64" stroke="' + P + '" stroke-width="3"/><path d="M8 0v64M24 0v64M40 0v64M56 0v64" stroke="' + S + '" stroke-width="3" stroke-opacity=".6"/>'; },
    satin: function (P, S) { return '<path d="M-4 20c20-12 36 12 72-6" stroke="' + P + '" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-4 46c24-14 40 14 72-4" stroke="' + S + '" stroke-width="5" fill="none" stroke-linecap="round" stroke-opacity=".7"/>'; },
    cherry: function (P, S) { return '<path d="M23 38c2-14 8-24 17-28m2 30c-2-12-2-22-2-30" stroke="' + S + '" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M40 10c6-2 12 2 12 6-6 2-10-2-12-6z" fill="' + S + '"/><circle cx="22" cy="44" r="9" fill="' + P + '"/><circle cx="43" cy="44" r="9" fill="' + P + '"/>'; },
    arch: function (P, S) { return '<path d="M10 50a22 22 0 0 1 44 0" fill="none" stroke="' + P + '" stroke-width="6"/><path d="M19 50a13 13 0 0 1 26 0" fill="none" stroke="' + S + '" stroke-width="6"/><path d="M27 50a5 5 0 0 1 10 0" fill="none" stroke="' + P + '" stroke-width="5"/>'; },
    tulip: function (P, S) { return '<path d="M32 34v22" stroke="' + S + '" stroke-width="3"/><path d="M32 52c-6-6-12-6-16-4 4 6 10 8 16 6z" fill="' + S + '"/><path d="M20 14l6 6 6-10 6 10 6-6v12c0 7-6 12-12 12s-12-5-12-12z" fill="' + P + '"/>'; },
    sun: function (P, S) { return '<circle cx="32" cy="32" r="11" fill="' + P + '"/><path d="M32 6v8m0 36v8M6 32h8m36 0h8M13.6 13.6l5.7 5.7m25.4 25.4 5.7 5.7m0-36.8-5.7 5.7M19.3 44.7l-5.7 5.7" stroke="' + S + '" stroke-width="3.5" stroke-linecap="round"/>'; },
    shell: function (P, S) { return '<path d="M32 12c14 0 24 12 22 28L40 52H24L10 40C8 24 18 12 32 12z" fill="' + P + '"/><path d="M32 14v36M22 16l6 34m14-34-6 34M14 26l11 24m25-24L39 50" stroke="' + S + '" stroke-width="1.6"/><rect x="26" y="50" width="12" height="5" rx="2" fill="' + S + '"/>'; },
    acorn: function (P, S) { return '<path d="M19 26h26c0 16-7 26-13 28-6-2-13-12-13-28z" fill="' + P + '"/><path d="M16 26c0-10 8-14 16-14s16 4 16 14z" fill="' + S + '"/><path d="M32 12c0-4 2-6 4-7" stroke="' + S + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>'; },
    snow: function (P) { return '<g stroke="' + P + '" stroke-width="3" stroke-linecap="round" fill="none"><path d="M32 8v48M11.2 20l41.6 24M11.2 44l41.6-24"/><path d="M26 12l6 6 6-6M26 52l6-6 6 6"/></g>'; },
    moon: function (P, S) { return '<path d="M40 10c-12 2-20 12-20 24s10 20 22 20c-8-4-12-12-12-22s4-18 10-22z" fill="' + P + '"/><path d="M48 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="' + S + '"/>'; },
    dots: function (P) { return '<circle cx="16" cy="16" r="2.4" fill="' + P + '"/><circle cx="48" cy="48" r="2.4" fill="' + P + '"/>'; }
  };
  const TEXTURES = { zebra: 1, cow: 1, weave: 1, satin: 1 };

  /* ---------- Daftar tema ----------
     g: f = cewek, m = cowok, n = netral (boleh lebih dari satu)
     bg, paper, ink, a (pemasukan/aksen utama), b (pengeluaran/aksen kedua), c1/c2 (gradasi lembut) */
  const T = [
    ['carat', 'Carat (Rose Quartz & Serenity)', 'Carat (Rose Quartz & Serenity)', 'f', 'gem', '#f6f7fb', '#ffffff', '#1a2233', '#3d5a99', '#b4466a', '#92a8d1', '#f7cac9'],
    ['tunas', 'Tunas (warna logo)', 'Sprout (logo colours)', 'n', 'sprout', '#f1f8f6', '#ffffff', '#0f2e35', '#1b7f6c', '#c0553f', '#5ce0c6', '#d9f7ef'],
    ['sakura', 'Sakura', 'Sakura', 'f', 'sakura', '#fdf4f6', '#ffffff', '#3a2330', '#7b4f9a', '#c8456f', '#ffc7d6', '#fbe6ec'],
    ['tennis', 'Tenis', 'Tennis', 'fmn', 'tennis', '#f5f9ec', '#ffffff', '#1f2d1a', '#2f7d4f', '#c75b1e', '#d8f05a', '#b9e3c6'],
    ['gym', 'Gym', 'Gym', 'm', 'dumbbell', '#111316', '#1b1e23', '#f1f3f4', '#7ee081', '#ff7a59', '#3ddc84', '#00bcd4', 1],
    ['badminton', 'Badminton', 'Badminton', 'mn', 'shuttle', '#f2f8fb', '#ffffff', '#13293d', '#1f6fb2', '#d1495b', '#a9e5ff', '#fff1a8'],
    ['pilates', 'Pilates', 'Pilates', 'f', 'ring', '#faf6f2', '#ffffff', '#3a302b', '#5f7356', '#b0566f', '#e8d5c4', '#d9e2d0'],
    ['padel', 'Padel', 'Padel', 'mn', 'paddle', '#f1f8f8', '#ffffff', '#102a33', '#0f7c8c', '#e0603a', '#9be7e0', '#ffe08a'],
    ['bola', 'Sepak bola', 'Football', 'm', 'ball', '#f0f7ef', '#ffffff', '#13261a', '#1e7a3c', '#c0392b', '#8fd694', '#e3f3dc'],
    ['aurora', 'Aurora', 'Aurora', 'n', 'aurora', '#0b1426', '#121e36', '#eaf2ff', '#6ee7c8', '#f39ac7', '#34d399', '#8b5cf6', 1],
    ['tanaman', 'Tanaman', 'Plants', 'n', 'leaf', '#f2f7ef', '#ffffff', '#1f2e1b', '#3f7d3a', '#b0603a', '#b7dfa0', '#e7f3d4'],
    ['boneka', 'Boneka', 'Teddy', 'f', 'teddy', '#fbf5f0', '#ffffff', '#3b2a22', '#8a5a3c', '#c45d74', '#f0d9c2', '#f9d6dc'],
    ['capybara', 'Capybara', 'Capybara', 'n', 'capy', '#f8f3ec', '#ffffff', '#33281d', '#7a5a36', '#b85c38', '#d9b98c', '#c9e4c5'],
    ['kelinci', 'Kelinci', 'Bunny', 'f', 'bunny', '#fbf6fb', '#ffffff', '#2f2a36', '#6a5fa8', '#c85a86', '#f3d4e6', '#e2ddf7'],
    ['polos', 'Polos (pilih warna)', 'Plain (pick a colour)', 'fmn', 'dots', '', '', '', '', '', '', ''],
    ['zebra', 'Motif zebra', 'Zebra stripes', 'fmn', 'zebra', '#f6f6f4', '#ffffff', '#141414', '#2f6f5e', '#a33a3a', '#d6d6d2', '#efefec'],
    ['sapi', 'Motif sapi', 'Cow print', 'fn', 'cow', '#fafaf8', '#ffffff', '#1d1d1d', '#3a6ea5', '#cc5a82', '#f6c6d4', '#e6e6e2'],
    ['matcha', 'Matcha', 'Matcha', 'fn', 'matcha', '#f3f6ec', '#ffffff', '#23301e', '#55783a', '#a8673e', '#c5dca0', '#efe6cf'],
    ['americano', 'Americano', 'Americano', 'mn', 'coffee', '#f5efe9', '#ffffff', '#2b1d16', '#6b4226', '#b0493a', '#d8bfa5', '#efe3d3'],
    ['espresso', 'Espresso (gelap)', 'Espresso (dark)', 'mn', 'coffee', '#16100c', '#211813', '#f4ebe3', '#e0b88a', '#f08a72', '#a9744a', '#5a3d2b', 1],
    ['buku', 'Buku', 'Books', 'n', 'books', '#f6f2e9', '#fffdf7', '#2a2420', '#2e5e4e', '#8e3b46', '#e3d5b8', '#c9d6c3'],
    ['mobil', 'Mobil', 'Cars', 'm', 'car', '#101215', '#1a1d22', '#eef0f2', '#4fc3f7', '#ff6b6b', '#ff5252', '#4fc3f7', 1],
    ['baking', 'Baking', 'Baking', 'f', 'cupcake', '#fdf6ef', '#ffffff', '#3a2a20', '#9a5a28', '#cc5a78', '#f7d9b5', '#fbd3dc'],
    ['aesthetic', 'Aesthetic', 'Aesthetic', 'fn', 'sparkle', '#f6f3ef', '#ffffff', '#2d2a26', '#6d6258', '#a8615b', '#e6dccf', '#d8d2e8'],
    ['kanvas', 'Kain kanvas', 'Canvas', 'mn', 'weave', '#eee8dc', '#fbf8f2', '#2e2a24', '#4a5d6b', '#a2533d', '#d3c7b1', '#c4cdd3'],
    ['satin', 'Satin', 'Satin', 'f', 'satin', '#f8f2f4', '#ffffff', '#2e2329', '#6c4f7d', '#b04d6a', '#ead2db', '#f3e6ec'],
    ['bunga', 'Perbungaan', 'Floral', 'f', 'daisy', '#fbf8f1', '#ffffff', '#2d2a22', '#5a7d4a', '#c0577b', '#ffd2de', '#fff0b3'],
    ['buah', 'Buah-buahan', 'Fruits', 'fn', 'cherry', '#fff7f1', '#ffffff', '#2f2219', '#2f8a4e', '#d64040', '#ffc4a3', '#ffe38a'],
    ['earth', 'Earth tone', 'Earth tone', 'mn', 'arch', '#f3eee5', '#fffcf7', '#2f261d', '#5f6f4e', '#a65a3a', '#d9b99b', '#c8c3a8'],
    ['spring', 'Spring tone', 'Spring tone', 'f', 'tulip', '#f6fbf3', '#ffffff', '#22301f', '#4c8a5a', '#d1607f', '#ffd0df', '#d4f0c2'],
    ['summer', 'Summer tone', 'Summer tone', 'n', 'sun', '#fffaf0', '#ffffff', '#2e2412', '#0a7ea4', '#e0662f', '#ffd56b', '#ffb199'],
    ['pantai', 'Pantai', 'Beach', 'n', 'shell', '#f2f9fb', '#ffffff', '#10303b', '#0b7a99', '#d9774f', '#9fe3f0', '#f6e3c3'],
    ['autumn', 'Autumn tone', 'Autumn tone', 'mn', 'acorn', '#fbf4ec', '#ffffff', '#33231a', '#6e7a32', '#b5501f', '#f2b880', '#e9cf9c'],
    ['winter', 'Winter tone', 'Winter tone', 'n', 'snow', '#f3f6fb', '#ffffff', '#1b2635', '#2f6db0', '#8e5bb0', '#cfe2f7', '#e7e0f7'],
    ['midnight', 'Midnight', 'Midnight', 'm', 'moon', '#0d111e', '#161b2c', '#e8ebf5', '#8fb3ff', '#ff8fa3', '#4f5fd6', '#9a7cf0', 1],
    ['monokrom', 'Monokrom', 'Monochrome', 'mn', 'dots', '#f4f4f4', '#ffffff', '#111111', '#2b2b2b', '#6e6e6e', '#d4d4d4', '#ececec']
  ].map(function (r) {
    return { id: r[0], name: { id: r[1], en: r[2] }, groups: r[3].split(''), motif: r[4], bg: r[5], paper: r[6], ink: r[7], a: r[8], b: r[9], c1: r[10], c2: r[11], dark: !!r[12] };
  });

  /* Pasangan warna grafik pemasukan/pengeluaran yang lolos uji buta warna, per tema */
  const CHART = {'carat':['#3d5a99','#b4466a'],'tunas':['#2a78d6','#c0553f'],'sakura':['#7b4f9a','#c8456f'],'tennis':['#2a78d6','#c75b1e'],'gym':['#3987e5','#d95926'],'badminton':['#1f6fb2','#d1495b'],'pilates':['#2a78d6','#b0566f'],'padel':['#2a78d6','#e0603a'],'bola':['#2a78d6','#c0392b'],'aurora':['#3987e5','#d95926'],'tanaman':['#2a78d6','#b0603a'],'boneka':['#2a78d6','#c45d74'],'capybara':['#2a78d6','#b85c38'],'kelinci':['#6a5fa8','#c85a86'],'zebra':['#2a78d6','#a33a3a'],'sapi':['#3a6ea5','#eb6834'],'matcha':['#2a78d6','#a8673e'],'americano':['#2a78d6','#b0493a'],'espresso':['#3987e5','#d95926'],'buku':['#2a78d6','#8e3b46'],'mobil':['#3987e5','#d95926'],'baking':['#9a5a28','#eb6834'],'aesthetic':['#2a78d6','#eb6834'],'kanvas':['#2a78d6','#a2533d'],'satin':['#2a78d6','#b04d6a'],'bunga':['#2a78d6','#c0577b'],'buah':['#2a78d6','#d64040'],'earth':['#2a78d6','#a65a3a'],'spring':['#2a78d6','#d1607f'],'summer':['#0a7ea4','#e0662f'],'pantai':['#2a78d6','#d9774f'],'autumn':['#2a78d6','#b5501f'],'winter':['#2f6db0','#eb6834'],'midnight':['#3987e5','#d95926'],'monokrom':['#2a78d6','#eb6834']};

  function plainFrom(color) {
    const h = hex2hsl(color);
    const hue = h[0], sat = Math.max(h[1], 35);
    const other = (hue + 165) % 360;
    return {
      id: 'polos', motif: 'dots', dark: false,
      bg: hsl2hex(hue, Math.min(sat, 40), 97), paper: '#ffffff', ink: hsl2hex(hue, 30, 13),
      a: hsl2hex(hue, Math.min(sat, 70), 38), b: hsl2hex(other, 55, 42),
      c1: hsl2hex(hue, Math.min(sat, 75), 80), c2: hsl2hex((hue + 40) % 360, 70, 88)
    };
  }

  /* ---------- Hitung semua variabel CSS dari warna dasar ---------- */
  function derive(t) {
    const dark = t.dark;
    const a = fit(t.a, t.paper, 4.5), b = fit(t.b, t.paper, 4.5);
    const aBtn = fit(t.a, '#ffffff', 3.4), bBtn = fit(t.b, '#ffffff', 3.4);
    const ink2 = fit(mix(t.ink, t.paper, 0.38), t.paper, 4.6);
    const ink3 = fit(mix(t.ink, t.paper, 0.55), t.paper, 3.1);
    const gradMid = mix(t.c1, t.c2, 0.5);
    const fabInk = contrast(t.ink, gradMid) >= contrast('#ffffff', gradMid) ? (dark ? t.paper : t.ink) : '#ffffff';
    return {
      '--mist': t.bg, '--paper': t.paper, '--ink': t.ink, '--ink-2': ink2, '--ink-3': ink3,
      '--line': mix(t.ink, t.paper, dark ? 0.86 : 0.91), '--line-2': mix(t.ink, t.paper, dark ? 0.78 : 0.86),
      '--serenity': t.c1, '--rose': t.c2,
      '--serenity-soft': mix(t.a, t.paper, dark ? 0.8 : 0.88), '--rose-soft': mix(t.b, t.paper, dark ? 0.8 : 0.89),
      '--serenity-ink': a, '--rose-ink': b,
      '--c-income': (CHART[t.id] || ['#2a78d6'])[0], '--c-expense': (CHART[t.id] || [0, '#eb6834'])[1],
      '--good': fit(dark ? '#5fd3a0' : '#1d7a55', t.paper, 4.5), '--bad': b, '--bad-solid': fit(t.b, '#ffffff', 4.5),
      '--grad': 'linear-gradient(135deg,' + t.c1 + ' 0%,' + gradMid + ' 50%,' + t.c2 + ' 100%)',
      '--grad-strong': 'linear-gradient(120deg,' + aBtn + ' 0%,' + bBtn + ' 100%)',
      '--glass': rgba(t.paper, dark ? 0.62 : 0.68), '--bar': rgba(t.paper, dark ? 0.84 : 0.8), '--bar-top': rgba(t.bg, 0.74),
      '--seg': mix(t.ink, t.paper, dark ? 0.88 : 0.93), '--track': mix(t.ink, t.paper, dark ? 0.9 : 0.95),
      '--hover': rgba(t.c1, 0.18), '--focus': rgba(t.c1, 0.3), '--inset': dark ? 'rgba(255,255,255,.06)' : '#fff',
      '--edge-a': rgba(t.c1, 0.9), '--edge-mid': rgba(t.paper, 0.5), '--edge-b': rgba(t.c2, 0.95),
      '--shadow-glass': '0 1px 0 ' + (dark ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.9)') + ' inset, 0 18px 40px -24px ' + rgba(dark ? '#000000' : aBtn, dark ? 0.7 : 0.45),
      '--btn-shadow': rgba(aBtn, dark ? 0.45 : 0.7), '--fab-shadow': rgba(bBtn, 0.5), '--fab-ink': fabInk,
      '--aura-o': dark ? 0.32 : 0.55, '--chart-grid': mix(t.ink, t.paper, dark ? 0.86 : 0.92), '--chart-axis': mix(t.ink, t.paper, dark ? 0.7 : 0.78)
    };
  }

  function svgUrl(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }
  function motifSvg(t, P, S, D) {
    const m = M[t.motif] || M.dots;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + m(P, S, D) + '</svg>';
  }
  function patternSvg(t, P, S, D) {
    const m = (M[t.motif] || M.dots)(P, S, D);
    if (TEXTURES[t.motif]) return '<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110" viewBox="0 0 64 64">' + m + '</svg>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">' +
      '<g transform="translate(12 14) rotate(-14 20 20) scale(.62)">' + m + '</g>' +
      '<g transform="translate(86 82) rotate(16 18 18) scale(.54)">' + m + '</g></svg>';
  }

  function resolve(id, plainColor) {
    if (id === 'polos') return Object.assign({}, T.find(function (x) { return x.id === 'polos'; }), plainFrom(plainColor || '#7c8cff'));
    return T.find(function (x) { return x.id === id; }) || T[0];
  }

  /** Terapkan tema ke halaman */
  function apply(id, plainColor) {
    const t = resolve(id, plainColor);
    const vars = derive(t);
    const root = document.documentElement;
    Object.keys(vars).forEach(function (k) { root.style.setProperty(k, vars[k]); });
    const texture = !!TEXTURES[t.motif];
    root.style.setProperty('--pattern', svgUrl(patternSvg(t, t.dark ? t.c1 : t.c1, t.a, t.ink)));
    root.style.setProperty('--pattern-o', t.dark ? (texture ? 0.1 : 0.16) : (texture ? 0.32 : 0.55));
    root.style.setProperty('--art', texture ? 'none' : svgUrl(motifSvg(t, t.c1, vars['--serenity-ink'], t.ink)));
    root.style.setProperty('--art-o', t.dark ? 0.3 : 0.45);
    root.style.colorScheme = t.dark ? 'dark' : 'light';
    root.dataset.theme = t.id;
    root.classList.toggle('theme-dark', t.dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.bg);
    return t;
  }

  /** Data kecil untuk kartu pratinjau di pemilih tema */
  function preview(id, plainColor) {
    const t = resolve(id, plainColor);
    const v = derive(t);
    return {
      t: t,
      bg: t.bg, paper: t.paper, ink: t.ink, a: v['--serenity-ink'], b: v['--rose-ink'], grad: v['--grad'],
      pattern: svgUrl(patternSvg(t, t.c1, t.a, t.ink)), art: svgUrl(motifSvg(t, t.c1, v['--serenity-ink'], t.ink)),
      patternO: t.dark ? 0.2 : (TEXTURES[t.motif] ? 0.4 : 0.6)
    };
  }

  return { list: T, apply: apply, preview: preview, derive: derive, resolve: resolve, contrast: contrast, fit: fit };
})();
