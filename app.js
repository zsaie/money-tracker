/* =========================================================
   Money Tracker — logika aplikasi
   ========================================================= */
(function () {
  'use strict';

  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  const LS = {
    get: function (k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* penuh */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* */ } }
  };
  const esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------------- State ---------------- */
  const S = {
    lang: LS.get('mt.lang', 'id'),
    data: LS.get('mt.data', null),
    outbox: LS.get('mt.outbox', []),
    period: LS.get('mt.period', { key: 'month' }),
    view: 'home',
    hist: { q: '', type: 'all', cat: '', from: '', to: '', limit: 60 },
    gran: 'day',
    syncing: false,
    flushing: false,
    lastSync: LS.get('mt.lastSync', 0),
    theme: LS.get('mt.theme', 'carat'),
    plainColor: LS.get('mt.plainColor', '#7c8cff'),
    themeGroup: 'all'
  };
  Themes.apply(S.theme, S.plainColor);

  /* ---------------- Bahasa ---------------- */
  function t(key, vars) {
    const dict = I18N[S.lang] || I18N.id;
    let s = dict[key] != null ? dict[key] : (I18N.id[key] != null ? I18N.id[key] : key);
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function locale() { return S.lang === 'en' ? 'en-GB' : 'id-ID'; }

  function applyI18n() {
    document.documentElement.lang = S.lang;
    $$('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
    $$('[data-i18n-ph]').forEach(function (n) { n.setAttribute('placeholder', t(n.getAttribute('data-i18n-ph'))); });
    $$('[data-i18n-aria]').forEach(function (n) { n.setAttribute('aria-label', t(n.getAttribute('data-i18n-aria'))); });
    $('#welcomeLang').textContent = S.lang === 'id' ? 'English' : 'Bahasa Indonesia';
    if (typeof updateThemeTag === 'function') updateThemeTag();
    $$('#langSeg button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === S.lang); });
  }

  function opts() { return (S.data && S.data.options) || {}; }
  function catList(type) { return opts()[type === 'income' ? 'incomeCategory' : 'expenseCategory'] || []; }
  function methodList(type) { return opts()[type === 'income' ? 'incomeMethod' : 'expenseMethod'] || []; }
  function translate(list, v) {
    if (S.lang !== 'en') return v;
    for (let i = 0; i < list.length; i++) if (list[i].v === v) return list[i].en || v;
    return v;
  }
  function catLabel(type, v) { return v ? translate(catList(type), v) : t('tx.noCategory'); }
  function methodLabel(type, v) { return translate(methodList(type), v); }
  function assetCatLabel(a) { return S.lang === 'en' && a.categoryEn ? a.categoryEn : a.category; }
  function assetTypeLabel(a) { return a.liquid ? t('asset.liquid') : t('asset.nonLiquid'); }

  /* ---------------- Format ---------------- */
  const nfCache = {};
  function nf() { return nfCache[S.lang] || (nfCache[S.lang] = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })); }
  function rp(n) { const v = Math.round(Number(n) || 0); return (v < 0 ? '−' : '') + 'Rp ' + nf().format(Math.abs(v)); }
  function rpSigned(n, type) { return (type === 'income' ? '+' : '−') + 'Rp ' + nf().format(Math.round(Math.abs(n))); }
  function compact(n) {
    const a = Math.abs(n);
    const units = S.lang === 'en' ? [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']] : [[1e12, ' T'], [1e9, ' M'], [1e6, ' jt'], [1e3, ' rb']];
    for (let i = 0; i < units.length; i++) {
      if (a >= units[i][0]) {
        const v = n / units[i][0];
        return new Intl.NumberFormat(locale(), { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v) + units[i][1];
      }
    }
    return nf().format(n);
  }
  function pct(n) { return new Intl.NumberFormat(locale(), { maximumFractionDigits: 0 }).format(n) + '%'; }
  function digitsOnly(s) { return String(s || '').replace(/\D/g, '').replace(/^0+(?=\d)/, ''); }
  function groupDigits(s) { const d = digitsOnly(s); return d ? nf().format(Number(d)) : ''; }

  /* ---------------- Tanggal ---------------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return iso(new Date()); }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function addMonths(s, n) {
    const d = parse(s); const day = d.getDate();
    const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
    r.setDate(Math.min(day, last));
    return iso(r);
  }
  function days(a, b) { return Math.round((parse(b) - parse(a)) / 86400000) + 1; }
  function fmtDate(s, o) { return s ? new Intl.DateTimeFormat(locale(), o).format(parse(s)) : ''; }
  function fmtRange(r) {
    if (r.from === r.to) return fmtDate(r.from, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const f = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
    return f.formatRange ? f.formatRange(parse(r.from), parse(r.to)) : f.format(parse(r.from)) + ' – ' + f.format(parse(r.to));
  }
  function dayHeading(s) {
    if (s === today()) return t('date.today');
    if (s === addDays(today(), -1)) return t('date.yesterday');
    return fmtDate(s, { weekday: 'long', day: 'numeric', month: 'long', year: parse(s).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }

  /* ---------------- Periode ---------------- */
  function rangeOf(p) {
    const tdy = today(); const d = parse(tdy);
    if (p.key === 'today') return { from: tdy, to: tdy };
    if (p.key === 'week') { const from = addDays(tdy, -((d.getDay() + 6) % 7)); return { from: from, to: addDays(from, 6) }; }
    if (p.key === 'custom') {
      let from = p.from || tdy.slice(0, 8) + '01', to = p.to || tdy;
      if (from > to) { const x = from; from = to; to = x; }
      return { from: from, to: to };
    }
    return { from: tdy.slice(0, 8) + '01', to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  }
  function effectiveEnd(r) { const tdy = today(); return r.from <= tdy && tdy <= r.to ? tdy : r.to; }
  function prevRangeOf(p, r) {
    const end = effectiveEnd(r);
    if (p.key === 'today') { const y = addDays(r.from, -1); return { from: y, to: y }; }
    if (p.key === 'week') return { from: addDays(r.from, -7), to: addDays(end, -7) };
    if (p.key === 'month') return { from: addMonths(r.from, -1), to: addMonths(end, -1) };
    const len = days(r.from, r.to); const to = addDays(r.from, -1);
    return { from: addDays(to, -(len - 1)), to: to };
  }

  /* ---------------- Data ---------------- */
  function allTx() {
    const base = (S.data && S.data.transactions) || [];
    const pending = S.outbox.map(function (o) { return Object.assign({}, o.tx, { pending: true }); });
    const ids = {};
    pending.forEach(function (p) { ids[p.id] = 1; });
    return base.filter(function (x) { return !ids[x.id]; }).concat(pending).sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.pending !== b.pending) return a.pending ? -1 : 1;
      return (b.row || 0) - (a.row || 0);
    });
  }
  function inRange(list, r) { return list.filter(function (x) { return x.date >= r.from && x.date <= r.to; }); }
  function sum(list) {
    let inc = 0, exp = 0;
    list.forEach(function (x) { if (x.type === 'income') inc += x.amount; else exp += x.amount; });
    return { inc: inc, exp: exp, net: inc - exp };
  }
  function saveData() { LS.set('mt.data', S.data); }
  function saveOutbox() { LS.set('mt.outbox', S.outbox); }
  function genId() {
    const a = new Uint8Array(8);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return 'T' + Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').slice(0, 15);
  }
  function upsertLocal(tx) {
    if (!S.data) S.data = { transactions: [], options: {}, assets: null };
    const list = S.data.transactions;
    const i = list.findIndex(function (x) { return x.id === tx.id; });
    if (i >= 0) list[i] = tx; else list.push(tx);
    saveData();
  }
  function removeLocal(id) {
    if (!S.data) return;
    S.data.transactions = S.data.transactions.filter(function (x) { return x.id !== id; });
    saveData();
  }

  /* ---------------- Sinkronisasi ---------------- */
  function setSync(text, warn) {
    const n = $('#syncState');
    n.textContent = text || '';
    n.classList.toggle('warn', !!warn);
  }
  function syncLabel() {
    if (S.outbox.length) return setSync(t('sync.pending', { n: S.outbox.length }), true);
    if (S.lastSync) {
      const time = new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(S.lastSync));
      return setSync(t('sync.updated', { time: time }));
    }
    setSync('');
  }

  async function refresh(silent) {
    if (S.syncing) return;
    if (!Api.hasToken()) { if (navigator.onLine !== false) handleError({ code: 'AUTH_REQUIRED' }); return; }
    S.syncing = true;
    $('#btnRefresh').classList.add('spin');
    if (!silent || !S.data) setSync(t('sync.loading'));
    try {
      const res = await Api.call('bootstrap');
      S.data = res.data;
      S.lastSync = Date.now();
      LS.set('mt.lastSync', S.lastSync);
      saveData();
      render();
      if (!silent) toast(t('toast.refreshed'), 'info', 1600);
    } catch (e) {
      handleError(e, t('err.load'));
      if (!S.data) render();
    } finally {
      S.syncing = false;
      $('#btnRefresh').classList.remove('spin');
      syncLabel();
    }
    flushOutbox();
  }

  async function flushOutbox() {
    if (S.flushing || !S.outbox.length || !Api.sheetId()) return;
    if (!Api.hasToken()) { if (navigator.onLine !== false) handleError({ code: 'AUTH_REQUIRED' }); return; }
    S.flushing = true;
    try {
      while (S.outbox.length) {
        const item = S.outbox[0];
        try {
          const res = await Api.call('add', { tx: item.tx });
          S.outbox.shift(); saveOutbox();
          upsertLocal(res.tx);
          toast(t('toast.saved'), 'ok');
        } catch (e) {
          if (Api.isNetworkError(e)) {
            if (!item.warned) { item.warned = true; saveOutbox(); toast(t('toast.offlineSaved'), 'info', 4200); }
            break;
          }
          if (e.code === 'AUTH_REQUIRED') { handleError(e); break; }
          S.outbox.shift(); saveOutbox();
          toast(t('toast.saveFailed') + ' ' + errText(e), 'err', 5000);
        }
        render();
      }
    } finally {
      S.flushing = false;
      syncLabel();
      render();
    }
  }

  function errText(e) {
    const map = {
      NETWORK: 'err.network', OFFLINE: 'err.offline', BAD_RESPONSE: 'err.badResponse', NO_URL: 'err.noUrl',
      NOT_FOUND: 'err.notFound', CONFLICT: 'err.conflict', HEADER_MISSING: 'err.header', FORBIDDEN: 'err.forbidden',
      TEMPLATE_MISMATCH: 'err.templateMismatch', SHEET_NOT_FOUND: 'err.sheetGone', NO_PICKER: 'err.noPicker'
    };
    if (map[e.code]) return t(map[e.code]);
    if (e.code === 'VALIDATION') return t('err.validation');
    return e.message || t('err.generic');
  }

  function handleError(e, prefix) {
    if (e && e.code === 'AUTH_REQUIRED') {
      if (Api.canSilentRefresh()) { Api.signIn({ prompt: 'none', hint: Api.email() }); return; }
      showWelcome(t('auth.expired'));
      return;
    }
    if (e && (e.code === 'NO_SHEET' || e.code === 'SHEET_NOT_FOUND' || e.code === 'TEMPLATE_MISMATCH')) { showConnect(t('err.sheetGone')); return; }
    toast((prefix ? prefix + ' ' : '') + errText(e), 'err', 5000);
  }

  /* ---------------- Notifikasi ---------------- */
  function toast(msg, kind, ms) {
    kind = kind || 'ok';
    const n = document.createElement('div');
    n.className = 'toast ' + kind;
    n.setAttribute('role', kind === 'err' ? 'alert' : 'status');
    n.innerHTML = '<span class="ti" aria-hidden="true">' + (kind === 'ok' ? '✓' : kind === 'err' ? '!' : 'i') + '</span><span>' + esc(msg) + '</span>';
    const box = $('#toasts');
    box.appendChild(n);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () { n.classList.add('out'); setTimeout(function () { n.remove(); }, 260); }, ms || 2600);
  }

  function confirmBox(title, text, yes, no) {
    return new Promise(function (resolve) {
      const w = $('#confirm');
      $('#confirmTitle').textContent = title;
      $('#confirmText').textContent = text;
      $('#confirmYes').textContent = yes || t('action.delete');
      $('#confirmNo').textContent = no || t('action.cancel');
      w.hidden = false;
      $('#confirmNo').focus();
      function done(v) {
        w.hidden = true;
        $('#confirmYes').onclick = $('#confirmNo').onclick = w.onclick = null;
        document.removeEventListener('keydown', key);
        resolve(v);
      }
      function key(e) { if (e.key === 'Escape') done(false); }
      document.addEventListener('keydown', key);
      $('#confirmYes').onclick = function () { done(true); };
      $('#confirmNo').onclick = function () { done(false); };
      w.onclick = function (e) { if (e.target === w) done(false); };
    });
  }

  /* ---------------- Lembar bawah ---------------- */
  let openSheetEl = null;
  function openSheet(el) {
    if (openSheetEl && openSheetEl !== el) closeSheet(true);
    openSheetEl = el;
    $('#scrim').hidden = false;
    el.hidden = false;
    el.classList.remove('closing');
    el.scrollTop = 0;
    try { history.pushState({ sheet: el.id }, ''); } catch (e) { /* */ }
  }
  function closeSheet(fromPop) {
    const el = openSheetEl;
    if (!el) return;
    openSheetEl = null;
    Charts.hideTip();
    el.classList.add('closing');
    $('#scrim').hidden = true;
    setTimeout(function () { el.hidden = true; el.classList.remove('closing'); }, 200);
    if (fromPop !== true) { try { if (history.state && history.state.sheet) history.back(); } catch (e) { /* */ } }
  }
  window.addEventListener('popstate', function () { if (openSheetEl) closeSheet(true); });

  function setBusy(btn, busy, label) {
    btn.disabled = busy;
    if (busy) { btn.dataset.label = btn.textContent; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + esc(label || t('action.saving')); }
    else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
  }

  /* ================= RENDER ================= */
  function render() {
    if (!S.data && !$('#app').hidden) renderSkeleton();
    if (!S.data) return;
    renderPeriod('#periodHome', '#customHome');
    renderPeriod('#periodStats', '#customStats');
    if (S.view === 'home') renderHome();
    if (S.view === 'history') renderHistory();
    if (S.view === 'stats') renderStats();
    if (S.view === 'assets') renderAssets();
    syncLabel();
  }

  function renderSkeleton() {
    $('#hero').innerHTML = '<div class="skeleton" style="height:18px;width:40%"></div><div class="skeleton" style="height:40px;width:70%;margin:12px 0 18px"></div><div class="skeleton" style="height:44px"></div>';
    $('#insights').innerHTML = '<div class="insight"><div class="skeleton" style="height:40px;width:40px"></div><div class="skeleton" style="height:40px"></div></div>';
    $('#recentList').innerHTML = '';
  }

  function renderPeriod(sel, customSel) {
    const box = $(sel);
    const keys = ['today', 'week', 'month', 'custom'];
    box.innerHTML = keys.map(function (k) {
      return '<button type="button" role="tab" data-p="' + k + '" class="' + (S.period.key === k ? 'on' : '') + '" aria-selected="' + (S.period.key === k) + '">' + t('period.' + k) + '</button>';
    }).join('');
    const c = $(customSel);
    c.hidden = S.period.key !== 'custom';
    if (!c.hidden) {
      const r = rangeOf(S.period);
      c.innerHTML = '<label class="field"><span class="field-label">' + t('history.from') + '</span><input type="date" data-c="from" value="' + r.from + '"></label>' +
        '<label class="field"><span class="field-label">' + t('history.to') + '</span><input type="date" data-c="to" value="' + r.to + '"></label>';
    }
  }

  function emptyState(title, text, withButton) {
    return '<div class="empty"><div class="empty-art" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 9.5h16M8 14.5h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>' +
      '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p>' +
      (withButton ? '<button type="button" class="btn-small" data-add>' + t('action.add') + '</button>' : '') + '</div>';
  }

  function txItem(x, showDate) {
    const isIn = x.type === 'income';
    const label = catLabel(x.type, x.category);
    const method = x.method ? '<span class="tag">' + esc(methodLabel(x.type, x.method)) + '</span>' : '';
    const pend = x.pending ? '<span class="tag pending">' + t('sync.pendingOne') + '</span>' : '';
    const note = x.notes ? '<span class="note">' + esc(x.notes) + '</span>' : '';
    const sub = note || method || pend ? '<span class="tx-sub">' + pend + note + method + '</span>' : '';
    return '<li><button type="button" class="tx" data-id="' + esc(x.id) + '">' +
      '<span class="tx-ico ' + (isIn ? 'in' : 'out') + '" aria-hidden="true">' + esc(label.charAt(0).toUpperCase()) + '</span>' +
      '<span class="tx-main"><span class="tx-cat">' + esc(label) + '</span>' + sub + '</span>' +
      '<span class="tx-amt num ' + (isIn ? 'in' : 'out') + '">' + rpSigned(x.amount, x.type) +
      (showDate ? '<span class="tx-date">' + esc(fmtDate(x.date, { day: 'numeric', month: 'short' })) + '</span>' : '') +
      '</span></button></li>';
  }

  /* ---------- Beranda ---------- */
  function renderHome() {
    const r = rangeOf(S.period);
    const txs = allTx();
    const cur = inRange(txs, r);
    const s = sum(cur);

    const ratio = s.inc > 0 ? (s.exp / s.inc) * 100 : null;
    let ratioHtml = '';
    if (ratio !== null) {
      ratioHtml = '<div class="ratio"><div class="ratio-bar' + (ratio > 100 ? ' over' : '') + '"><span style="width:' + Math.min(ratio, 100).toFixed(1) + '%"></span></div>' +
        '<p class="ratio-text">' + (ratio > 100 ? t('home.ratioOver', { p: pct(ratio - 100) }) : t('home.ratio', { p: pct(ratio) })) + '</p></div>';
    } else if (s.exp > 0) {
      ratioHtml = '<div class="ratio"><p class="ratio-text">' + t('home.noIncome') + '</p></div>';
    }
    $('#hero').innerHTML = '<span class="hero-art" aria-hidden="true"></span>' +
      '<p class="hero-label">' + t('home.net') + '</p>' +
      '<p class="hero-amount num' + (s.net < 0 ? ' neg' : '') + '">' + rp(s.net) + '</p>' +
      '<p class="hero-range">' + esc(fmtRange(r)) + '</p>' +
      '<div class="hero-split">' +
      '<div><span class="k"><i class="dot in"></i>' + t('type.income') + '</span><div class="v num">' + rp(s.inc) + '</div></div>' +
      '<div><span class="k"><i class="dot out"></i>' + t('type.expense') + '</span><div class="v num">' + rp(s.exp) + '</div></div>' +
      '</div>' + ratioHtml;

    // Insight
    const exp = cur.filter(function (x) { return x.type === 'expense'; });
    const ins = [];
    if (exp.length) {
      const byCat = {};
      exp.forEach(function (x) { byCat[x.category] = (byCat[x.category] || 0) + x.amount; });
      const top = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; })[0];
      ins.push(insight('rose', 'top', t('ins.top'), esc(catLabel('expense', top)),
        t('ins.topSub', { v: rp(byCat[top]), p: pct((byCat[top] / s.exp) * 100) })));
      const n = days(r.from, effectiveEnd(r));
      ins.push(insight('', 'avg', t('ins.avg'), rp(s.exp / Math.max(n, 1)), t('ins.avgSub', { n: n })));
    }
    const pr = prevRangeOf(S.period, r);
    const ps = sum(inRange(txs, pr));
    const cs = sum(inRange(txs, { from: r.from, to: effectiveEnd(r) }));
    const cmpTitle = t('ins.cmp.' + S.period.key);
    if (ps.exp > 0) {
      const ch = ((cs.exp - ps.exp) / ps.exp) * 100;
      const up = ch > 0;
      const line = Math.abs(ch) < 0.5 ? t('ins.same') : t(up ? 'ins.up' : 'ins.down', { p: pct(Math.abs(ch)) });
      ins.push(insight(up ? 'rose' : '', up ? 'up' : 'down', cmpTitle,
        '<span class="' + (Math.abs(ch) < 0.5 ? '' : up ? 'delta-bad' : 'delta-good') + '">' + line + '</span>',
        t('ins.cmpSub', { a: rp(cs.exp), b: rp(ps.exp) }) + (ps.inc || cs.inc ? '<br>' + t('ins.cmpInc', { a: rp(cs.inc), b: rp(ps.inc) }) : '')));
    } else {
      ins.push(insight('', 'down', cmpTitle, t('ins.noPrev'), esc(fmtRange(pr))));
    }
    $('#insights').innerHTML = exp.length || ps.exp ? ins.join('') :
      '<div class="insight">' + icon('avg', '') + '<div><h3>' + t('ins.emptyTitle') + '</h3><p style="font-size:15px;font-weight:600">' + t('ins.empty') + '</p></div></div>';

    // Terbaru
    const recent = txs.slice(0, 6);
    $('#recentList').innerHTML = recent.map(function (x) { return txItem(x, true); }).join('');
    const after = $('#recentList').nextElementSibling;
    if (after && after.classList.contains('empty')) after.remove();
    if (!recent.length) $('#recentList').insertAdjacentHTML('afterend', emptyState(t('empty.title'), t('empty.text'), true));
  }

  function icon(kind, tone) {
    const paths = {
      top: '<path d="M12 3v18M5 10l7-7 7 7" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      avg: '<path d="M4 18h16M6 14l4-4 3 3 5-6" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      up: '<path d="M5 15l5-5 4 4 5-6M19 8v5M19 8h-5" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      down: '<path d="M5 9l5 5 4-4 5 6M19 16v-5M19 16h-5" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    return '<span class="insight-ico ' + tone + '" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22">' + paths[kind] + '</svg></span>';
  }
  function insight(tone, kind, title, value, sub) {
    return '<div class="insight">' + icon(kind, tone) + '<div><h3>' + title + '</h3><p class="num">' + value + '</p>' + (sub ? '<small class="num">' + sub + '</small>' : '') + '</div></div>';
  }

  /* ---------- Riwayat ---------- */
  function renderHistory() {
    const h = S.hist;
    // daftar kategori
    const sel = $('#hCategory');
    const cats = {};
    const types = h.type === 'all' ? ['expense', 'income'] : [h.type];
    types.forEach(function (ty) { catList(ty).forEach(function (c) { cats[ty + '|' + c.v] = { type: ty, v: c.v }; }); });
    allTx().forEach(function (x) { if (types.indexOf(x.type) >= 0 && x.category && !cats[x.type + '|' + x.category]) cats[x.type + '|' + x.category] = { type: x.type, v: x.category }; });
    const values = Object.keys(cats).map(function (k) { return cats[k]; });
    const uniq = {};
    sel.innerHTML = '<option value="">' + t('history.allCats') + '</option>' + values.filter(function (c) {
      if (uniq[c.v]) return false; uniq[c.v] = 1; return true;
    }).map(function (c) {
      return '<option value="' + esc(c.v) + '"' + (h.cat === c.v ? ' selected' : '') + '>' + esc(catLabel(c.type, c.v)) + '</option>';
    }).join('');
    if (h.cat && !uniq[h.cat]) h.cat = '';

    $$('#hType button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === h.type); });
    $('#hFrom').value = h.from; $('#hTo').value = h.to;

    const q = h.q.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const list = allTx().filter(function (x) {
      if (h.type !== 'all' && x.type !== h.type) return false;
      if (h.cat && x.category !== h.cat) return false;
      if (h.from && x.date < h.from) return false;
      if (h.to && x.date > h.to) return false;
      if (q) {
        const hay = [x.notes, x.category, catLabel(x.type, x.category), x.method, methodLabel(x.type, x.method)].join(' ').toLowerCase();
        const amtHit = qDigits && /^[\d.,\s]+$/.test(q) && String(Math.round(x.amount)).indexOf(qDigits) !== -1;
        if (hay.indexOf(q) === -1 && !amtHit) return false;
      }
      return true;
    });

    const s = sum(list);
    $('#hMeta').innerHTML = list.length
      ? t('history.meta', { n: nf().format(list.length), inc: rp(s.inc), exp: rp(s.exp) })
      : '';

    const box = $('#historyList');
    if (!list.length) {
      const filtered = h.q || h.cat || h.from || h.to || h.type !== 'all';
      box.innerHTML = filtered ? emptyState(t('history.noResult'), t('history.noResultText'), false) : emptyState(t('empty.title'), t('empty.text'), true);
      return;
    }
    const shown = list.slice(0, h.limit);
    const groups = [];
    shown.forEach(function (x) {
      const g = groups[groups.length - 1];
      if (g && g.date === x.date) g.items.push(x); else groups.push({ date: x.date, items: [x] });
    });
    box.innerHTML = groups.map(function (g) {
      const gs = sum(g.items);
      return '<div class="day-group"><div class="day-head"><span>' + esc(dayHeading(g.date || '')) + '</span><span class="num">' + rp(gs.net) + '</span></div>' +
        '<ul class="tx-list">' + g.items.map(function (x) { return txItem(x, false); }).join('') + '</ul></div>';
    }).join('') + (list.length > shown.length ? '<button type="button" class="btn-ghost load-more" id="loadMore">' + t('history.more', { n: nf().format(list.length - shown.length) }) + '</button>' : '');
  }

  /* ---------- Analisis ---------- */
  function renderStats() {
    const r = rangeOf(S.period);
    const txs = allTx();
    const exp = inRange(txs, r).filter(function (x) { return x.type === 'expense'; });
    const total = exp.reduce(function (a, x) { return a + x.amount; }, 0);
    $('#catTotal').textContent = total ? rp(total) : '';

    // per kategori
    const byCat = {};
    exp.forEach(function (x) { byCat[x.category] = (byCat[x.category] || 0) + x.amount; });
    let rows = Object.keys(byCat).map(function (k) { return { k: k, v: byCat[k] }; }).sort(function (a, b) { return b.v - a.v; });
    if (rows.length > 8) {
      const rest = rows.slice(7).reduce(function (a, x) { return a + x.v; }, 0);
      rows = rows.slice(0, 7).concat([{ k: null, v: rest }]);
    }
    const maxV = rows.length ? rows[0].v : 1;
    $('#chartCategory').innerHTML = rows.length ? '<div class="bars">' + rows.map(function (x) {
      const name = x.k === null ? t('stats.other') : catLabel('expense', x.k);
      return '<div class="bar-row"><div class="bar-top"><span class="name">' + esc(name) + '</span><span class="val num">' + rp(x.v) + '<small>' + pct((x.v / total) * 100) + '</small></span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.max((x.v / maxV) * 100, 1.5).toFixed(1) + '%"></div></div></div>';
    }).join('') + '</div>' : emptyState(t('stats.noExpense'), t('stats.noExpenseText'), true);

    // tren
    $$('#trendGran button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === S.gran); });
    const trendBox = $('#chartTrend');
    let pts = [];
    if (S.gran === 'day') {
      const end = effectiveEnd(r);
      let start = r.from;
      if (days(start, end) > 92) start = addDays(end, -91);
      const map = {};
      txs.forEach(function (x) { if (x.type === 'expense' && x.date >= start && x.date <= end) map[x.date] = (map[x.date] || 0) + x.amount; });
      for (let d = start; d <= end; d = addDays(d, 1)) {
        pts.push({ label: fmtDate(d, { day: 'numeric', month: days(start, end) > 31 ? 'short' : undefined }), tip: fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' }), value: map[d] || 0 });
      }
    } else {
      pts = monthBuckets(12, 'expense', txs).map(function (m) { return { label: m.short, tip: m.long, value: m.exp }; });
    }
    if (pts.every(function (p) { return !p.value; })) {
      trendBox.innerHTML = '<p class="result-meta" style="text-align:center;margin:30px 0">' + t('stats.noTrend') + '</p>';
    } else {
      Charts.line(trendBox, pts, { color: cssVar('--c-expense'), fmt: rp, fmtAxis: compact, ariaLabel: t('stats.trend') });
    }

    // perbandingan 6 bulan
    const ms = monthBuckets(6, null, txs);
    const series = [{ name: t('type.income'), color: cssVar('--c-income') }, { name: t('type.expense'), color: cssVar('--c-expense') }];
    $('#compareLegend').innerHTML = series.map(function (s) { return '<span><i class="dot" style="background:' + s.color + '"></i>' + esc(s.name) + '</span>'; }).join('');
    Charts.groupBars($('#chartCompare'), ms.map(function (m) { return { label: m.short, tip: m.long, values: [m.inc, m.exp] }; }), series, { fmt: rp, fmtAxis: compact, ariaLabel: t('stats.compare') });
    $('#compareTable').innerHTML = '<table class="mini-table"><thead><tr><th>' + t('stats.month') + '</th><th>' + t('type.income') + '</th><th>' + t('type.expense') + '</th><th>' + t('stats.net') + '</th></tr></thead><tbody>' +
      ms.map(function (m) { return '<tr><td>' + esc(m.long) + '</td><td class="num">' + rp(m.inc) + '</td><td class="num">' + rp(m.exp) + '</td><td class="num">' + rp(m.inc - m.exp) + '</td></tr>'; }).join('') + '</tbody></table>';
  }

  function monthBuckets(n, _type, txs) {
    const now = new Date();
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
      out.push({
        key: key, inc: 0, exp: 0,
        short: new Intl.DateTimeFormat(locale(), { month: 'short' }).format(d),
        long: new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(d)
      });
    }
    const idx = {};
    out.forEach(function (m, i) { idx[m.key] = i; });
    txs.forEach(function (x) {
      const i = idx[x.date.slice(0, 7)];
      if (i === undefined) return;
      if (x.type === 'income') out[i].inc += x.amount; else out[i].exp += x.amount;
    });
    return out;
  }

  /* ---------- Aset ---------- */
  function renderAssets() {
    const a = S.data && S.data.assets;
    if (!a) {
      $('#assetHero').innerHTML = '';
      $('#assetList').innerHTML = emptyState(t('asset.missing'), t('asset.missingText'), false);
      return;
    }
    const liqP = a.total ? (a.liquid / a.total) * 100 : 0;
    $('#assetHero').innerHTML = '<span class="hero-art" aria-hidden="true"></span>' +
      '<p class="hero-label">' + t('asset.total') + '</p>' +
      '<p class="hero-amount num">' + rp(a.total) + '</p>' +
      '<p class="hero-range">' + t('asset.heroSub') + '</p>' +
      '<div class="hero-split">' +
      '<div><span class="k"><i class="dot in"></i>' + t('asset.liquid') + '</span><div class="v num">' + rp(a.liquid) + '</div></div>' +
      '<div><span class="k"><i class="dot out"></i>' + t('asset.nonLiquid') + '</span><div class="v num">' + rp(a.nonLiquid) + '</div></div>' +
      '</div>' +
      (a.total ? '<div class="split-bar" role="img" aria-label="' + esc(t('asset.liquid') + ' ' + pct(liqP)) + '"><span class="liq" style="width:' + liqP.toFixed(1) + '%"></span><span class="non" style="flex:1"></span></div>' +
        '<p class="ratio-text">' + t('asset.liquidShare', { p: pct(liqP) }) + '</p>' : '<p class="ratio-text">' + t('asset.empty') + '</p>');

    const groups = [
      { title: t('asset.liquid'), items: a.items.filter(function (x) { return x.liquid; }), total: a.liquid },
      { title: t('asset.nonLiquid'), items: a.items.filter(function (x) { return !x.liquid; }), total: a.nonLiquid }
    ];
    $('#assetList').innerHTML = groups.map(function (g) {
      if (!g.items.length) return '';
      return '<section class="asset-group"><div class="asset-group-head"><h2>' + esc(g.title) + '</h2><span class="num">' + rp(g.total) + '</span></div><ul class="tx-list">' +
        g.items.map(function (x) {
          const sub = [x.location, x.notes].filter(Boolean).map(esc).join(', ');
          return '<li><button type="button" class="tx" data-asset="' + x.row + '">' +
            '<span class="tx-ico ' + (x.liquid ? 'in' : 'out') + '" aria-hidden="true">' + esc(assetCatLabel(x).charAt(0)) + '</span>' +
            '<span class="tx-main"><span class="tx-cat">' + esc(assetCatLabel(x)) + '</span>' + (sub ? '<span class="tx-sub"><span class="note">' + sub + '</span></span>' : '') + '</span>' +
            '<span class="tx-amt num' + (x.value ? '' : ' asset-value-muted') + '">' + rp(x.value) +
            (x.updated ? '<span class="tx-date">' + esc(fmtDate(x.updated, { day: 'numeric', month: 'short', year: '2-digit' })) + '</span>' : (x.value ? '' : '<span class="tx-date">' + t('asset.tapToFill') + '</span>')) +
            '</span></button></li>';
        }).join('') + '</ul></section>';
    }).join('');
  }

  /* ================= FORM TRANSAKSI ================= */
  const F = { mode: 'new', id: null, orig: null, type: 'expense', category: '', method: '', date: today() };

  function usageOrder(type) {
    const cutoff = addDays(today(), -120);
    const count = {};
    allTx().forEach(function (x) { if (x.type === type && x.date >= cutoff) count[x.category] = (count[x.category] || 0) + 1; });
    const list = catList(type).map(function (c, i) { return { v: c.v, i: i, n: count[c.v] || 0 }; });
    return list.sort(function (a, b) { return b.n - a.n || a.i - b.i; }).map(function (x) { return x.v; });
  }

  function renderForm() {
    const form = $('#txForm');
    form.classList.toggle('t-expense', F.type === 'expense');
    form.classList.toggle('t-income', F.type === 'income');
    $$('#txType button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === F.type); b.setAttribute('aria-selected', b.dataset.v === F.type); });

    const cats = usageOrder(F.type);
    if (F.category && cats.indexOf(F.category) === -1) cats.unshift(F.category);
    $('#txCats').innerHTML = cats.length ? cats.map(function (v) {
      return '<button type="button" class="chip' + (F.category === v ? ' on' : '') + '" role="option" aria-selected="' + (F.category === v) + '" data-v="' + esc(v) + '">' + esc(catLabel(F.type, v)) + '</button>';
    }).join('') : '<p class="result-meta">' + t('tx.noCats') + '</p>';

    const ms = methodList(F.type).map(function (m) { return m.v; });
    if (F.method && ms.indexOf(F.method) === -1) ms.unshift(F.method);
    $('#txMethods').innerHTML = ms.map(function (v) {
      return '<button type="button" class="chip' + (F.method === v ? ' on' : '') + '" role="option" aria-selected="' + (F.method === v) + '" data-v="' + esc(v) + '">' + esc(methodLabel(F.type, v)) + '</button>';
    }).join('');
    $('#txMethods').closest('.field').hidden = !ms.length;

    $('#txDate').value = F.date;
    $$('.date-row .chip').forEach(function (c) { c.classList.toggle('on', addDays(today(), +c.dataset.d) === F.date); });
  }

  function openTx(tx) {
    clearErrors();
    if (tx) {
      F.mode = 'edit'; F.id = tx.id; F.orig = tx; F.type = tx.type; F.category = tx.category; F.method = tx.method || ''; F.date = tx.date || today();
      $('#txAmount').value = groupDigits(String(Math.round(tx.amount)));
      $('#txNotes').value = tx.notes || '';
      $('#txTitle').textContent = t('tx.edit');
      $('#txSave').textContent = t('action.saveChanges');
      $('#txDelete').hidden = false;
    } else {
      F.mode = 'new'; F.id = null; F.orig = null;
      F.type = LS.get('mt.lastType', 'expense');
      F.category = ''; F.date = today();
      F.method = LS.get('mt.lastMethod.' + F.type, '');
      $('#txAmount').value = '';
      $('#txNotes').value = '';
      $('#txTitle').textContent = t('tx.new');
      $('#txSave').textContent = t('action.save');
      $('#txDelete').hidden = true;
    }
    $('#txSave').disabled = false;
    renderForm();
    openSheet($('#txSheet'));
    if (!tx) setTimeout(function () { $('#txAmount').focus(); }, 60);
  }

  function clearErrors() {
    ['#amountErr', '#catErr', '#assetErr'].forEach(function (s) { $(s).hidden = true; });
    $$('.amount-field').forEach(function (n) { n.classList.remove('invalid'); });
  }
  function fieldError(sel, msg, wrap) {
    const n = $(sel); n.textContent = msg; n.hidden = false;
    if (wrap) $(wrap).classList.add('invalid');
  }

  async function submitTx(e) {
    e.preventDefault();
    clearErrors();
    const amount = Number(digitsOnly($('#txAmount').value));
    let ok = true;
    if (!amount || amount <= 0) { fieldError('#amountErr', t('val.amount'), '#amountField'); ok = false; }
    if (!F.category) { fieldError('#catErr', t('val.category')); ok = false; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(F.date)) { ok = false; toast(t('val.date'), 'err'); }
    if (!ok) { if (!amount) $('#txAmount').focus(); return; }

    const tx = { id: F.id || genId(), type: F.type, date: F.date, category: F.category, amount: amount, notes: $('#txNotes').value.trim(), method: F.method };
    LS.set('mt.lastType', F.type);
    LS.set('mt.lastMethod.' + F.type, F.method);

    if (F.mode === 'new') {
      S.outbox.push({ op: 'add', tx: tx, ts: Date.now() });
      saveOutbox();
      closeSheet();
      render();
      flushOutbox();
      return;
    }

    // Edit transaksi yang belum terkirim: cukup ubah antrean
    const qi = S.outbox.findIndex(function (o) { return o.tx.id === tx.id; });
    if (qi >= 0) {
      S.outbox[qi].tx = tx; saveOutbox();
      closeSheet(); render(); toast(t('toast.updated'), 'ok'); flushOutbox();
      return;
    }
    const btn = $('#txSave');
    setBusy(btn, true);
    try {
      const res = await Api.call('update', { tx: tx });
      upsertLocal(res.tx);
      closeSheet(); render();
      toast(t('toast.updated'), 'ok');
    } catch (err) {
      handleError(err, t('toast.updateFailed'));
    } finally {
      setBusy(btn, false);
    }
  }

  async function deleteTx() {
    const tx = F.orig;
    if (!tx) return;
    const yes = await confirmBox(t('del.title'), t('del.text', { cat: catLabel(tx.type, tx.category), amt: rp(tx.amount), date: fmtDate(tx.date, { day: 'numeric', month: 'long', year: 'numeric' }) }));
    if (!yes) return;
    const qi = S.outbox.findIndex(function (o) { return o.tx.id === tx.id; });
    if (qi >= 0) {
      S.outbox.splice(qi, 1); saveOutbox();
      closeSheet(); render(); toast(t('toast.deleted'), 'ok');
      return;
    }
    const btn = $('#txDelete');
    setBusy(btn, true, t('action.deleting'));
    try {
      await Api.call('delete', { id: tx.id, type: tx.type });
      removeLocal(tx.id);
      closeSheet(); render();
      toast(t('toast.deleted'), 'ok');
    } catch (err) {
      if (err.code === 'NOT_FOUND') { removeLocal(tx.id); closeSheet(); render(); toast(t('toast.alreadyGone'), 'info', 3500); }
      else handleError(err, t('toast.deleteFailed'));
    } finally {
      setBusy(btn, false);
    }
  }

  /* ================= FORM ASET ================= */
  let editingAsset = null;
  function openAsset(row) {
    const a = S.data.assets.items.find(function (x) { return x.row === row; });
    if (!a) return;
    editingAsset = a;
    clearErrors();
    $('#assetTitle').textContent = assetCatLabel(a);
    $('#assetHint').textContent = assetTypeLabel(a) + (a.updated ? '. ' + t('asset.lastUpdate', { d: fmtDate(a.updated, { day: 'numeric', month: 'long', year: 'numeric' }) }) : '');
    $('#assetValue').value = a.value ? groupDigits(String(Math.round(a.value))) : '';
    $('#assetLocation').value = a.location || '';
    $('#assetNotes').value = a.notes || '';
    openSheet($('#assetSheet'));
    setTimeout(function () { $('#assetValue').focus(); }, 60);
  }
  async function submitAsset(e) {
    e.preventDefault();
    clearErrors();
    const raw = digitsOnly($('#assetValue').value);
    if (raw === '') { fieldError('#assetErr', t('val.assetValue')); return; }
    const btn = $('#assetSave');
    setBusy(btn, true);
    try {
      const res = await Api.call('updateAsset', { asset: { row: editingAsset.row, category: editingAsset.category, value: Number(raw), location: $('#assetLocation').value.trim(), notes: $('#assetNotes').value.trim() } });
      S.data.assets = res.asset; saveData();
      closeSheet(); render();
      toast(t('toast.assetSaved'), 'ok');
    } catch (err) {
      handleError(err, t('toast.saveFailed'));
    } finally {
      setBusy(btn, false);
    }
  }

  /* ================= TEMA ================= */
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  const SWATCHES = ['#e8577e', '#f08a4b', '#e3b23c', '#4caf7a', '#2bb3a3', '#3b82f6', '#7c8cff', '#9b6bd6', '#8d6e63', '#5f6b7a'];

  function themeName(th) { return th.name[S.lang] || th.name.id; }
  function renderThemes() {
    $$('#themeGroups button').forEach(function (b) { b.classList.toggle('on', b.dataset.g === S.themeGroup); });
    const list = Themes.list.filter(function (th) { return S.themeGroup === 'all' || th.groups.indexOf(S.themeGroup) >= 0; });
    $('#themeGrid').innerHTML = list.map(function (th) {
      const p = Themes.preview(th.id, S.plainColor);
      const on = S.theme === th.id;
      return '<button type="button" class="theme-card' + (on ? ' on' : '') + '" role="option" aria-selected="' + on + '" data-theme="' + th.id + '">' +
        '<span class="tc-prev" style="background:' + p.bg + '">' +
        '<span class="tc-pat" style="background-image:' + p.pattern.replace(/"/g, '&quot;') + ';opacity:' + p.patternO + '"></span>' +
        '<span class="tc-dots"><i style="background:' + p.a + '"></i><i style="background:' + p.b + '"></i></span>' +
        '<span class="tc-art" style="background-image:' + p.art.replace(/"/g, '&quot;') + '"></span>' +
        '<span class="tc-bar" style="background:' + p.grad + '"></span></span>' +
        '<span class="tc-name">' + esc(themeName(th)) + '</span></button>';
    }).join('');
    $('#plainPicker').hidden = S.theme !== 'polos';
    $('#plainColor').value = S.plainColor;
    $('#plainSwatches').innerHTML = SWATCHES.map(function (c) { return '<button type="button" class="swatch" data-c="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join('');
  }
  function setTheme(id, color) {
    if (color) { S.plainColor = color; LS.set('mt.plainColor', color); }
    S.theme = id; LS.set('mt.theme', id);
    Themes.apply(S.theme, S.plainColor);
    renderThemes();
    if (S.data && !$('#app').hidden) render();
    updateThemeTag();
  }
  function updateThemeTag() {
    const th = Themes.list.find(function (x) { return x.id === S.theme; });
    const tag = $('#themeNameTag'); if (tag && th) tag.textContent = themeName(th);
  }
  function openThemes() { renderThemes(); openSheet($('#themeSheet')); }

  /* ================= PENGATURAN ================= */
  function openSettings() {
    clearErrors();
    const link = $('#openSheet');
    link.href = (S.data && S.data.sheetUrl) || '#';
    link.hidden = !(S.data && S.data.sheetUrl);
    const em = Api.email();
    $('#settingsFoot').textContent = (em ? t('settings.account', { e: em }) + ' ' : '') + t('settings.foot', { v: APP_CONFIG.VERSION }) +
      (S.lastSync ? ' ' + t('settings.lastSync', { d: new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(S.lastSync)) }) : '');
    applyI18n();
    openSheet($('#settingsSheet'));
  }
  async function logout() {
    const pending = S.outbox.length;
    const yes = await confirmBox(t('logout.title'), pending ? t('logout.pending', { n: pending }) : t('logout.text'), t('logout.yes'));
    if (!yes) return;
    await Api.signOut();
    ['mt.data', 'mt.outbox', 'mt.lastSync'].forEach(LS.del);
    S.data = null; S.outbox = []; S.lastSync = 0;
    closeSheet();
    showWelcome();
  }
  function changeSheet() {
    if (S.outbox.length) { toast(t('connect.pendingFirst'), 'err', 4500); flushOutbox(); return; }
    closeSheet();
    showConnect();
  }

  /* ================= MASUK & PILIH SPREADSHEET ================= */
  function showOnly(id) { ['#welcome', '#connect', '#app'].forEach(function (s) { $(s).hidden = s !== id; }); }
  function showWelcome(msg) {
    closeSheet(true);
    showOnly('#welcome');
    applyI18n();
    const m = $('#welcomeMsg');
    if (!Api.isConfigured()) msg = t('err.notConfigured');
    m.textContent = msg || '';
    m.hidden = !msg;
    $('#btnGoogle').disabled = !Api.isConfigured();
  }
  function setConnectMsg(msg) { const m = $('#connectMsg'); m.textContent = msg || ''; m.hidden = !msg; }
  async function showConnect(msg) {
    closeSheet(true);
    showOnly('#connect');
    applyI18n();
    $('#connectEmail').textContent = Api.email() ? t('connect.as', { e: Api.email() }) : '';
    $('#btnPick').hidden = !(APP_CONFIG.GOOGLE_API_KEY && APP_CONFIG.GOOGLE_APP_ID);
    setConnectMsg(msg);
    const list = $('#connectList');
    list.innerHTML = '<div class="skeleton" style="height:56px;margin-top:18px"></div>';
    try {
      const files = await Api.listSheets();
      list.innerHTML = files.length ? '<p class="field-label connect-label">' + t('connect.found') + '</p><div class="settings-list">' + files.map(function (f) {
        const when = f.modifiedTime ? new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(f.modifiedTime)) : '';
        return '<button type="button" class="settings-item" data-sheet="' + esc(f.id) + '"><span>' + esc(f.name) + '<small class="connect-date">' + esc(when) + '</small></span><span aria-hidden="true">›</span></button>';
      }).join('') + '</div>' : '';
    } catch (e) {
      list.innerHTML = '';
      if (e.code === 'AUTH_REQUIRED') return handleError(e);
      setConnectMsg(errText(e));
    }
  }
  async function connectTo(id, btn) {
    setConnectMsg('');
    if (btn) setBusy(btn, true, t('connect.checking'));
    const prev = Api.sheetId();
    Api.useSheet(id);
    try {
      const res = await Api.call('bootstrap');
      S.data = res.data; saveData();
      S.lastSync = Date.now(); LS.set('mt.lastSync', S.lastSync);
      showApp();
      toast(t('connect.done', { n: res.data.title }), 'ok', 3200);
      flushOutbox();
    } catch (e) {
      Api.useSheet(prev && prev !== id ? prev : '');
      if (e.code === 'AUTH_REQUIRED') return handleError(e);
      setConnectMsg(e.code === 'TEMPLATE_MISMATCH' ? t('err.templateMismatch') : errText(e));
    } finally {
      if (btn) setBusy(btn, false);
    }
  }
  async function createSheet() {
    const btn = $('#btnCreate');
    setBusy(btn, true, t('connect.creating'));
    setConnectMsg('');
    try {
      const id = await Api.createFromTemplate(t('connect.sheetTitle'));
      await connectTo(id);
    } catch (e) {
      if (e.code === 'AUTH_REQUIRED') return handleError(e);
      setConnectMsg(errText(e));
    } finally {
      setBusy(btn, false);
    }
  }
  async function pickSheet() {
    try {
      const id = await Api.pick(S.lang);
      if (id) await connectTo(id, $('#btnPick'));
    } catch (e) {
      if (e.code === 'AUTH_REQUIRED') return handleError(e);
      setConnectMsg(errText(e));
    }
  }
  function showApp() {
    showOnly('#app');
    applyI18n();
    go(S.view, true);
  }

  /* ================= NAVIGASI ================= */
  function go(view, force) {
    if (view === S.view && !force) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    S.view = view;
    Charts.hideTip();
    $$('.view').forEach(function (v) { v.hidden = v.dataset.view !== view; });
    $$('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.goto === view); b.setAttribute('aria-current', b.dataset.goto === view ? 'page' : 'false'); });
    $('#viewTitle').textContent = t('nav.' + view);
    window.scrollTo(0, 0);
    render();
  }

  function setLang(l) {
    S.lang = l; LS.set('mt.lang', l);
    applyI18n();
    if (!$('#app').hidden) { $('#viewTitle').textContent = t('nav.' + S.view); render(); }
    if (!$('#txSheet').hidden) renderForm();
    if (!$('#themeSheet').hidden) renderThemes();
  }

  /* ================= EVENT ================= */
  function bind() {
    document.addEventListener('click', function (e) {
      const g = e.target.closest('[data-goto]');
      if (g) { go(g.dataset.goto); return; }
      if (e.target.closest('[data-add]')) { openTx(); return; }
      const txb = e.target.closest('.tx[data-id]');
      if (txb) { const x = allTx().find(function (y) { return y.id === txb.dataset.id; }); if (x) openTx(x); return; }
      const ab = e.target.closest('.tx[data-asset]');
      if (ab) { openAsset(Number(ab.dataset.asset)); return; }
      const pb = e.target.closest('.period button');
      if (pb) {
        const k = pb.dataset.p;
        S.period = k === 'custom' ? Object.assign({}, S.period, rangeOf(S.period), { key: 'custom' }) : { key: k };
        LS.set('mt.period', S.period); render(); return;
      }
      if (e.target.closest('[data-close]')) { closeSheet(); return; }
      if (e.target.id === 'loadMore') { S.hist.limit += 100; renderHistory(); }
    });
    document.addEventListener('change', function (e) {
      const c = e.target.closest('.custom-range input');
      if (c && c.value) {
        S.period[c.dataset.c] = c.value; S.period.key = 'custom';
        LS.set('mt.period', S.period); render();
      }
    });

    $('#fab').addEventListener('click', function () { openTx(); });
    $('#scrim').addEventListener('click', function () { closeSheet(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openSheetEl) closeSheet();
    });
    $('#btnRefresh').addEventListener('click', function () { refresh(false); });
    $('#btnSettings').addEventListener('click', openSettings);
    $('#btnTheme').addEventListener('click', openThemes);
    $('#btnThemeSettings').addEventListener('click', openThemes);
    $('#themeGroups').addEventListener('click', function (e) { const b = e.target.closest('button'); if (!b) return; S.themeGroup = b.dataset.g; renderThemes(); });
    $('#themeGrid').addEventListener('click', function (e) { const b = e.target.closest('.theme-card'); if (b) setTheme(b.dataset.theme); });
    $('#plainColor').addEventListener('input', function (e) { setTheme('polos', e.target.value); });
    $('#plainSwatches').addEventListener('click', function (e) { const b = e.target.closest('.swatch'); if (b) setTheme('polos', b.dataset.c); });

    // Masuk & pilih spreadsheet
    $('#btnGoogle').addEventListener('click', function () { Api.signIn({ prompt: 'select_account' }); });
    $('#welcomeLang').addEventListener('click', function () { setLang(S.lang === 'id' ? 'en' : 'id'); });
    $('#btnCreate').addEventListener('click', createSheet);
    $('#btnPick').addEventListener('click', pickSheet);
    $('#connectList').addEventListener('click', function (e) { const b = e.target.closest('[data-sheet]'); if (b) connectTo(b.dataset.sheet, b); });
    $('#connectLogout').addEventListener('click', async function () { await Api.signOut(); Api.signIn({ prompt: 'select_account' }); });

    // Form transaksi
    $('#txType').addEventListener('click', function (e) {
      const b = e.target.closest('button'); if (!b || b.dataset.v === F.type) return;
      F.type = b.dataset.v; F.category = '';
      F.method = F.mode === 'new' ? LS.get('mt.lastMethod.' + F.type, '') : F.method;
      renderForm();
    });
    $('#txCats').addEventListener('click', function (e) {
      const b = e.target.closest('.chip'); if (!b) return;
      F.category = b.dataset.v; $('#catErr').hidden = true; renderForm();
    });
    $('#txMethods').addEventListener('click', function (e) {
      const b = e.target.closest('.chip'); if (!b) return;
      F.method = F.method === b.dataset.v ? '' : b.dataset.v; renderForm();
    });
    $$('.date-row .chip').forEach(function (c) { c.addEventListener('click', function () { F.date = addDays(today(), +c.dataset.d); renderForm(); }); });
    $('#txDate').addEventListener('change', function (e) { if (e.target.value) { F.date = e.target.value; renderForm(); } });
    function moneyInput(inp, errSel) {
      inp.addEventListener('input', function () {
        const v = groupDigits(inp.value);
        if (inp.value !== v) inp.value = v;
        if (errSel) { $(errSel).hidden = true; const w = inp.closest('.amount-field'); if (w) w.classList.remove('invalid'); }
      });
    }
    moneyInput($('#txAmount'), '#amountErr');
    moneyInput($('#assetValue'), '#assetErr');
    $('#txForm').addEventListener('submit', submitTx);
    $('#txDelete').addEventListener('click', deleteTx);
    $('#assetForm').addEventListener('submit', submitAsset);

    // Riwayat
    let qTimer;
    $('#hSearch').addEventListener('input', function (e) { clearTimeout(qTimer); qTimer = setTimeout(function () { S.hist.q = e.target.value; S.hist.limit = 60; renderHistory(); }, 150); });
    $('#hType').addEventListener('click', function (e) { const b = e.target.closest('button'); if (!b) return; S.hist.type = b.dataset.v; S.hist.limit = 60; renderHistory(); });
    $('#hCategory').addEventListener('change', function (e) { S.hist.cat = e.target.value; S.hist.limit = 60; renderHistory(); });
    $('#hFrom').addEventListener('change', function (e) { S.hist.from = e.target.value; renderHistory(); });
    $('#hTo').addEventListener('change', function (e) { S.hist.to = e.target.value; renderHistory(); });

    // Analisis
    $('#trendGran').addEventListener('click', function (e) { const b = e.target.closest('button'); if (!b) return; S.gran = b.dataset.v; renderStats(); });
    let rz;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (S.view === 'stats' && S.data) renderStats(); }, 200); });

    // Pengaturan
    $('#langSeg').addEventListener('click', function (e) { const b = e.target.closest('button'); if (b) setLang(b.dataset.v); });
    $('#btnLogout').addEventListener('click', logout);
    $('#btnChangeSheet').addEventListener('click', changeSheet);

    window.addEventListener('online', function () { flushOutbox(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && Api.sheetId() && !$('#app').hidden) {
        if (Date.now() - S.lastSync > 120000) refresh(true); else flushOutbox();
      }
    });
  }

  /* ================= MULAI ================= */
  function start() {
    const r = Api.consumeRedirect();
    bind();
    applyI18n();
    if (!Api.isConfigured()) return showWelcome();
    if (r && r.error) {
      const quiet = ['interaction_required', 'login_required', 'consent_required', 'account_selection_required'].indexOf(r.error) >= 0;
      return showWelcome(r.error === 'access_denied' ? t('auth.denied') : r.error === 'scope' ? t('auth.scope') : quiet ? '' : t('auth.failed'));
    }
    if (!Api.hasToken()) {
      if (Api.sheetId() && S.data && navigator.onLine === false) return showApp();     // offline: tampilkan data terakhir
      if (Api.canSilentRefresh()) return Api.signIn({ prompt: 'none', hint: Api.email() });
      return showWelcome();
    }
    const go2 = function () {
      if (!Api.sheetId()) return showConnect();
      showApp();
      refresh(true);
      if (/[?&]add=1/.test(location.search)) {
        try { history.replaceState(null, '', location.pathname); } catch (e) { /* */ }
        openTx();
      }
    };
    if (!Api.email()) Api.fetchEmail().catch(function () { /* */ }).then(go2); else go2();
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* */ }); });
  }

  start();
})();
