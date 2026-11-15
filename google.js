/* =========================================================
   Google: login + penyimpanan langsung ke Google Sheets milik
   pengguna. Tidak ada server sendiri: aplikasi bicara langsung
   ke Google Sheets API dengan izin "drive.file", artinya
   aplikasi HANYA bisa membuka spreadsheet yang ia buat sendiri
   atau yang dipilih pengguna lewat pemilih file Google.
   ========================================================= */
window.Api = (function () {
  'use strict';

  const C = window.APP_CONFIG || {};
  const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
  const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
  const SCOPES = 'https://www.googleapis.com/auth/drive.file email';
  const N = { income: 'Pemasukan', expense: 'Pengeluaran', assets: 'Aset', assetsEn: 'Assets', options: 'Dropdown options' };
  const OPT = {
    incomeCategory: { id: 1, en: 6 }, incomeMethod: { id: 2, en: 7 },
    expenseCategory: { id: 3, en: 9 }, expenseMethod: { id: 4, en: 8 }, assetType: { id: 5, en: 10 }
  };
  const FIELD_ALIASES = {
    id: ['id'], date: ['tanggal', 'date', 'tgl'], category: ['kategori', 'category'],
    amount: ['nominal', 'amount', 'jumlah'], notes: ['keterangan', 'notes', 'catatan', 'note'],
    method: ['sumber dana', 'metode', 'payment', 'fund source', 'akun']
  };
  const ASSET_ALIASES = {
    type: ['jenis', 'type'], category: ['kategori', 'category'], value: ['nilai', 'value'],
    notes: ['keterangan', 'notes'], location: ['lokasi', 'platform', 'location'], updated: ['tanggal update', 'update', 'last updated']
  };
  const DATE_FMT = { type: 'DATE', pattern: 'dd/mm/yyyy' };
  const MONEY_FMT = { type: 'CURRENCY', pattern: '"Rp"#,##0' };

  const LS = {
    get: function (k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* */ } }
  };

  let auth = LS.get('mt.gauth', null);          // { token, exp }
  let email = LS.get('mt.email', '');
  let sheetId = LS.get('mt.sheetId', '');
  let meta = null;                              // { title, sheets: { name: { id, rows, cols } } }
  const maps = {};

  /* ---------------- util ---------------- */
  function fail(code, message, extra) { const e = new Error(message || code); e.code = code; if (extra) Object.assign(e, extra); return e; }
  function str(v) { return v == null ? '' : String(v); }
  function isBlank(v) { return v === undefined || v === null || v === ''; }
  function q(name) { return "'" + name.replace(/'/g, "''") + "'"; }
  function col(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function rand(n) { const a = new Uint8Array(n || 16); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function genId() { return 'T' + rand(8).slice(0, 15); }
  function pad(n) { return ('0' + n).slice(-2); }
  function todayIso() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function serialToIso(n) { return new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10); }
  function isoToSerial(s) { const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]) / 86400000 + 25569; }
  function toIsoDate(v) {
    if (isBlank(v)) return '';
    if (typeof v === 'number') return serialToIso(v);
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad(m[2]) + '-' + pad(m[1]);
    return '';
  }
  function toNumber(v) {
    if (typeof v === 'number') return v;
    if (isBlank(v)) return 0;
    let s = String(v).replace(/[^\d,.\-]/g, '');
    if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    else if (/^-?\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  function matchHeaders(headers, aliases, fields) {
    const map = {}, used = {};
    fields.forEach(function (f) {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (used[i] || !h) continue;
        const hit = f === 'id' ? h === 'id' : aliases[f].some(function (a) { return h === a || h.indexOf(a) !== -1; });
        if (hit) { map[f] = i + 1; used[i] = true; break; }
      }
    });
    return map;
  }

  /* ---------------- login (OAuth, tanpa server) ---------------- */
  function redirectUri() { return location.origin + location.pathname.replace(/index\.html$/, ''); }
  function isConfigured() { return !!C.GOOGLE_CLIENT_ID; }
  function hasToken() { return !!(auth && auth.token && auth.exp > Date.now() + 30000); }

  function signIn(opts) {
    opts = opts || {};
    const state = rand(16);
    LS.set('mt.oauthState', state);
    if (opts.prompt === 'none') LS.set('mt.silentAt', Date.now());
    const p = new URLSearchParams({
      client_id: C.GOOGLE_CLIENT_ID, redirect_uri: redirectUri(), response_type: 'token',
      scope: SCOPES, include_granted_scopes: 'true', state: state, prompt: opts.prompt || 'select_account'
    });
    if (opts.hint) p.set('login_hint', opts.hint);
    location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + p.toString());
  }

  /** Dipanggil saat aplikasi dibuka: ambil token dari URL setelah kembali dari Google. */
  function consumeRedirect() {
    if (!/(access_token|error)=/.test(location.hash)) return null;
    const p = new URLSearchParams(location.hash.slice(1));
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* */ }
    const expected = LS.get('mt.oauthState', '');
    LS.del('mt.oauthState');
    if (!expected || p.get('state') !== expected) return { error: 'state' };
    if (p.get('error')) return { error: p.get('error') };
    const scope = p.get('scope') || '';
    if (scope.indexOf('drive.file') === -1) return { error: 'scope' };
    auth = { token: p.get('access_token'), exp: Date.now() + (Number(p.get('expires_in')) || 3600) * 1000 };
    LS.set('mt.gauth', auth);
    LS.del('mt.silentAt');
    return { ok: true };
  }

  function canSilentRefresh() {
    const last = LS.get('mt.silentAt', 0);
    return !!email && navigator.onLine !== false && Date.now() - last > 30000;
  }

  async function signOut() {
    const tok = auth && auth.token;
    auth = null; sheetId = ''; meta = null; email = '';
    ['mt.gauth', 'mt.sheetId', 'mt.email', 'mt.silentAt'].forEach(LS.del);
    if (tok) {
      try { await fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(tok), { method: 'POST' }); } catch (e) { /* */ }
    }
  }

  /* ---------------- HTTP ke Google ---------------- */
  async function req(url, opts) {
    if (!hasToken()) throw fail('AUTH_REQUIRED');
    opts = opts || {};
    let res;
    try {
      const headers = { Authorization: 'Bearer ' + auth.token };
      if (opts.body) headers['Content-Type'] = 'application/json';
      res = await fetch(url, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    } catch (e) {
      throw fail(navigator.onLine === false ? 'OFFLINE' : 'NETWORK');
    }
    if (res.status === 401) { auth.exp = 0; LS.set('mt.gauth', auth); throw fail('AUTH_REQUIRED'); }
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || ('HTTP ' + res.status);
      if (res.status === 404) throw fail('SHEET_NOT_FOUND', msg);
      if (res.status === 403) throw fail(/rate|quota/i.test(msg) ? 'NETWORK' : 'FORBIDDEN', msg);
      if (res.status === 429 || res.status >= 500) throw fail('NETWORK', msg);
      throw fail('SERVER', msg);
    }
    return data;
  }

  async function fetchEmail() {
    const d = await req('https://www.googleapis.com/oauth2/v3/userinfo');
    email = (d && d.email) || '';
    LS.set('mt.email', email);
    return email;
  }

  function needSheet() { if (!sheetId) throw fail('NO_SHEET'); }
  async function loadMeta() {
    needSheet();
    const d = await req(SHEETS_API + '/' + encodeURIComponent(sheetId) + '?fields=properties.title,sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))');
    meta = { title: d.properties.title, sheets: {} };
    (d.sheets || []).forEach(function (s) {
      const p = s.properties;
      meta.sheets[p.title] = { id: p.sheetId, rows: p.gridProperties.rowCount, cols: p.gridProperties.columnCount };
    });
    if (!meta.sheets[N.income] || !meta.sheets[N.expense]) throw fail('TEMPLATE_MISMATCH');
    return meta;
  }
  async function batchGet(ranges) {
    const p = new URLSearchParams({ valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'SERIAL_NUMBER' });
    ranges.forEach(function (r) { p.append('ranges', r); });
    const d = await req(SHEETS_API + '/' + encodeURIComponent(sheetId) + '/values:batchGet?' + p.toString());
    return (d.valueRanges || []).map(function (v) { return v.values || []; });
  }
  function batchUpdate(requests) {
    return req(SHEETS_API + '/' + encodeURIComponent(sheetId) + ':batchUpdate', { method: 'POST', body: { requests: requests } });
  }
  function writeValues(data) {
    return req(SHEETS_API + '/' + encodeURIComponent(sheetId) + '/values:batchUpdate', { method: 'POST', body: { valueInputOption: 'RAW', data: data } });
  }

  /* ---------------- sel ---------------- */
  function strCell(v) { return { userEnteredValue: { stringValue: str(v) } }; }
  function dateCell(iso) { return { userEnteredValue: { numberValue: isoToSerial(iso) }, userEnteredFormat: { numberFormat: DATE_FMT } }; }
  function moneyCell(n) { return { userEnteredValue: { numberValue: n }, userEnteredFormat: { numberFormat: MONEY_FMT } }; }
  function txCells(map, tx) {
    const width = Math.max(map.id, map.date, map.category, map.amount, map.notes || 0, map.method || 0);
    const cells = [];
    for (let i = 0; i < width; i++) cells.push({});
    cells[map.date - 1] = dateCell(tx.date);
    cells[map.category - 1] = strCell(tx.category);
    cells[map.amount - 1] = moneyCell(tx.amount);
    if (map.notes) cells[map.notes - 1] = strCell(tx.notes);
    if (map.method) cells[map.method - 1] = strCell(tx.method);
    cells[map.id - 1] = strCell(tx.id);
    return cells;
  }
  function cellReq(sheet, row, c, cell) {
    return { updateCells: { range: { sheetId: sheet, startRowIndex: row - 1, endRowIndex: row, startColumnIndex: c - 1, endColumnIndex: c }, rows: [{ values: [cell] }], fields: 'userEnteredValue,userEnteredFormat.numberFormat' } };
  }

  /* ---------------- baca ---------------- */
  function headerMap(type, header, writes, colAdds) {
    const name = N[type];
    const h = (header || []).map(function (x) { return str(x).trim().toLowerCase(); });
    const map = matchHeaders(h, FIELD_ALIASES, ['id', 'date', 'category', 'amount', 'notes', 'method']);
    map.lastCol = h.length;
    ['date', 'category', 'amount'].forEach(function (f) { if (!map[f]) throw fail('HEADER_MISSING', name + ': ' + f); });
    if (!map.id) {
      map.id = map.lastCol + 1;
      writes.push({ range: q(name) + '!' + col(map.id) + '1', values: [['ID']] });
      const info = meta.sheets[name];
      if (map.id > info.cols) { colAdds.push({ appendDimension: { sheetId: info.id, dimension: 'COLUMNS', length: map.id - info.cols } }); info.cols = map.id; }
    }
    maps[type] = map;
    return map;
  }
  function readTx(type, rows, writes, colAdds) {
    const map = headerMap(type, rows[0], writes, colAdds);
    const name = N[type];
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const d = row[map.date - 1], a = row[map.amount - 1];
      if (isBlank(d) && isBlank(a)) continue;
      let id = str(row[map.id - 1]).trim();
      if (!id) { id = genId(); writes.push({ range: q(name) + '!' + col(map.id) + (r + 1), values: [[id]] }); }
      out.push({
        id: id, type: type, date: toIsoDate(d), category: str(row[map.category - 1]).trim(), amount: toNumber(a),
        notes: map.notes ? str(row[map.notes - 1]) : '', method: map.method ? str(row[map.method - 1]).trim() : '', row: r + 1
      });
    }
    return out;
  }
  function readOptions(rows) {
    const out = {};
    Object.keys(OPT).forEach(function (k) {
      out[k] = [];
      (rows || []).forEach(function (r) {
        const v = str(r[OPT[k].id - 1]).trim();
        if (v) out[k].push({ v: v, en: str(r[OPT[k].en - 1]).trim() || v });
      });
    });
    return out;
  }
  function assetLayout(rows) {
    let h = -1;
    for (let i = 0; i < rows.length; i++) {
      const a = str((rows[i] || [])[0]).trim().toLowerCase();
      if (a === 'jenis' || a === 'type') { h = i; break; }
    }
    if (h < 0) return null;
    const headers = rows[h].map(function (x) { return str(x).trim().toLowerCase(); });
    const map = matchHeaders(headers, ASSET_ALIASES, ['type', 'category', 'value', 'notes', 'location', 'updated']);
    if (!map.type || !map.category) return null;
    const items = [];
    for (let j = h + 1; j < rows.length; j++) {
      const r = rows[j] || [];
      if (!str(r[map.category - 1]).trim()) break;
      items.push({ idx: j, r: r });
    }
    return { map: map, items: items };
  }
  function readAssets(rows, enRows) {
    const L = assetLayout(rows || []);
    if (!L) return null;
    const m = L.map;
    let liquid = 0, nonLiquid = 0;
    const items = L.items.map(function (it) {
      const r = it.r;
      const value = m.value ? toNumber(r[m.value - 1]) : 0;
      const type = str(r[m.type - 1]).trim();
      const isLiquid = /^(likuid|liquid)$/i.test(type);
      if (isLiquid) liquid += value; else nonLiquid += value;
      const en = enRows && enRows[it.idx] ? str(enRows[it.idx][m.category - 1]).trim() : '';
      return {
        row: it.idx + 1, type: type, liquid: isLiquid, category: str(r[m.category - 1]).trim(), categoryEn: en, value: value,
        notes: m.notes ? str(r[m.notes - 1]) : '', location: m.location ? str(r[m.location - 1]) : '',
        updated: m.updated ? toIsoDate(r[m.updated - 1]) : ''
      };
    });
    return { items: items, liquid: liquid, nonLiquid: nonLiquid, total: liquid + nonLiquid };
  }

  async function bootstrap() {
    await loadMeta();
    const has = function (n) { return !!meta.sheets[n]; };
    const ranges = [q(N.income) + '!A1:Z', q(N.expense) + '!A1:Z'];
    if (has(N.assets)) ranges.push(q(N.assets) + '!A1:Z');
    if (has(N.assetsEn)) ranges.push(q(N.assetsEn) + '!A1:Z');
    if (has(N.options)) ranges.push(q(N.options) + '!A1:J');
    const vals = await batchGet(ranges);
    let i = 2;
    const aset = has(N.assets) ? vals[i++] : null;
    const asetEn = has(N.assetsEn) ? vals[i++] : null;
    const opt = has(N.options) ? vals[i++] : [];
    const writes = [], colAdds = [];
    const txs = readTx('income', vals[0], writes, colAdds).concat(readTx('expense', vals[1], writes, colAdds));
    if (colAdds.length) await batchUpdate(colAdds);
    if (writes.length) await writeValues(writes);
    return {
      transactions: txs, options: readOptions(opt), assets: aset ? readAssets(aset, asetEn) : null,
      sheetUrl: 'https://docs.google.com/spreadsheets/d/' + sheetId + '/edit', title: meta.title, email: email
    };
  }

  async function getMap(type) {
    if (!meta) await loadMeta();
    if (maps[type]) return maps[type];
    const rows = (await batchGet([q(N[type]) + '!1:1']))[0];
    const writes = [], colAdds = [];
    const map = headerMap(type, rows[0], writes, colAdds);
    if (colAdds.length) await batchUpdate(colAdds);
    if (writes.length) await writeValues(writes);
    return map;
  }
  async function locate(id, prefer) {
    const order = prefer === 'income' ? ['income', 'expense'] : ['expense', 'income'];
    for (let k = 0; k < order.length; k++) {
      const type = order[k];
      const map = await getMap(type);
      const ids = (await batchGet([q(N[type]) + '!' + col(map.id) + ':' + col(map.id)]))[0];
      for (let r = 1; r < ids.length; r++) {
        if (str((ids[r] || [])[0]).trim() === id) return { type: type, row: r + 1, map: map };
      }
    }
    return null;
  }

  /* ---------------- tulis ---------------- */
  function validate(tx) {
    if (!tx || typeof tx !== 'object') throw fail('VALIDATION');
    const type = tx.type === 'income' || tx.type === 'expense' ? tx.type : null;
    const amount = Number(tx.amount);
    const date = str(tx.date);
    const category = str(tx.category).trim().slice(0, 100);
    if (!type) throw fail('VALIDATION', 'type');
    if (!isFinite(amount) || amount <= 0 || amount > 1e13) throw fail('VALIDATION', 'amount');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw fail('VALIDATION', 'date');
    if (!category) throw fail('VALIDATION', 'category');
    return {
      id: /^[A-Za-z0-9_-]{6,40}$/.test(str(tx.id)) ? str(tx.id) : genId(), type: type, date: date, category: category,
      amount: Math.round(amount * 100) / 100, notes: str(tx.notes).trim().slice(0, 500), method: str(tx.method).trim().slice(0, 100)
    };
  }
  function appendReq(type, map, tx) {
    return { appendCells: { sheetId: meta.sheets[N[type]].id, rows: [{ values: txCells(map, tx) }], fields: 'userEnteredValue,userEnteredFormat.numberFormat' } };
  }
  function removeReq(type, row) {
    const info = meta.sheets[N[type]];
    if (info.rows <= 2) {
      return { updateCells: { range: { sheetId: info.id, startRowIndex: row - 1, endRowIndex: row }, fields: 'userEnteredValue' } };
    }
    info.rows--;
    return { deleteDimension: { range: { sheetId: info.id, dimension: 'ROWS', startIndex: row - 1, endIndex: row } } };
  }

  async function add(raw) {
    const tx = validate(raw);
    const map = await getMap(tx.type);
    const ids = (await batchGet([q(N[tx.type]) + '!' + col(map.id) + ':' + col(map.id)]))[0];
    if (ids.some(function (r) { return str((r || [])[0]).trim() === tx.id; })) return tx;   // sudah tersimpan
    await batchUpdate([appendReq(tx.type, map, tx)]);
    return tx;
  }
  async function update(raw) {
    if (!raw || !raw.id) throw fail('VALIDATION', 'id');
    const tx = validate(raw);
    const f = await locate(tx.id, tx.type);
    if (!f) throw fail('NOT_FOUND');
    if (f.type === tx.type) {
      const sid = meta.sheets[N[tx.type]].id, m = f.map, reqs = [];
      reqs.push(cellReq(sid, f.row, m.date, dateCell(tx.date)));
      reqs.push(cellReq(sid, f.row, m.category, strCell(tx.category)));
      reqs.push(cellReq(sid, f.row, m.amount, moneyCell(tx.amount)));
      if (m.notes) reqs.push(cellReq(sid, f.row, m.notes, strCell(tx.notes)));
      if (m.method) reqs.push(cellReq(sid, f.row, m.method, strCell(tx.method)));
      await batchUpdate(reqs);
      return tx;
    }
    const target = await getMap(tx.type);
    await batchUpdate([removeReq(f.type, f.row), appendReq(tx.type, target, tx)]);
    return tx;
  }
  async function remove(id, type) {
    const f = await locate(str(id), type);
    if (!f) throw fail('NOT_FOUND');
    await batchUpdate([removeReq(f.type, f.row)]);
    return id;
  }
  async function updateAsset(raw) {
    if (!raw) throw fail('VALIDATION');
    const value = Number(raw.value);
    if (!isFinite(value) || value < 0) throw fail('VALIDATION', 'value');
    if (!meta) await loadMeta();
    if (!meta.sheets[N.assets]) throw fail('NOT_FOUND');
    const rows = (await batchGet([q(N.assets) + '!A1:Z']))[0];
    const L = assetLayout(rows);
    if (!L) throw fail('NOT_FOUND');
    const it = L.items.find(function (x) { return x.idx + 1 === Number(raw.row); });
    if (!it) throw fail('NOT_FOUND');
    const m = L.map;
    if (str(it.r[m.category - 1]).trim() !== str(raw.category).trim()) throw fail('CONFLICT');
    const sid = meta.sheets[N.assets].id, row = it.idx + 1, reqs = [];
    if (m.value) reqs.push(cellReq(sid, row, m.value, moneyCell(Math.round(value * 100) / 100)));
    if (m.notes) reqs.push(cellReq(sid, row, m.notes, strCell(str(raw.notes).slice(0, 500))));
    if (m.location) reqs.push(cellReq(sid, row, m.location, strCell(str(raw.location).slice(0, 100))));
    if (m.updated) reqs.push(cellReq(sid, row, m.updated, dateCell(todayIso())));
    await batchUpdate(reqs);
    const after = await batchGet([q(N.assets) + '!A1:Z'].concat(meta.sheets[N.assetsEn] ? [q(N.assetsEn) + '!A1:Z'] : []));
    return readAssets(after[0], after[1]);
  }

  /* ---------------- spreadsheet baru dari template ---------------- */
  function cell(v) {
    if (v === undefined || v === null || v === '') return {};
    if (typeof v === 'object') {
      const c = {};
      if (v.f) c.userEnteredValue = { formulaValue: v.f };
      else c.userEnteredValue = { stringValue: v.s };
      if (v.b) c.userEnteredFormat = { textFormat: { bold: true }, backgroundColor: { red: 0.95, green: 0.96, blue: 0.98 } };
      return c;
    }
    return typeof v === 'number' ? { userEnteredValue: { numberValue: v } } : { userEnteredValue: { stringValue: v } };
  }
  function bold(list) { return list.map(function (s) { return { s: s, b: true }; }); }
  function sheet(title, rows, opts) {
    opts = opts || {};
    return {
      properties: { title: title, gridProperties: { rowCount: opts.rows || 1000, columnCount: opts.cols || 12, frozenRowCount: opts.freeze || 0 } },
      data: [{ startRow: 0, startColumn: 0, rowData: rows.map(function (r) { return { values: r.map(cell) }; }) }]
    };
  }
  function assetRows(lang) {
    const id = lang === 'id';
    const liq = id ? ['Gaji Bulanan', 'Tabungan', 'Uang Tunai', 'Dompet Digital', 'Deposito', 'Reksa Dana', 'Saham', 'Obligasi', 'Crypto', 'Emas', 'Aset Likuid Lainnya']
      : ['Monthly Salary', 'Savings', 'Cash', 'E-Wallet', 'Time Deposit', 'Mutual Funds', 'Stocks', 'Bonds', 'Crypto', 'Gold', 'Other Liquid Assets'];
    const non = id ? ['BPJS Ketenagakerjaan', 'Dana Pensiun', 'Properti', 'Kendaraan', 'Aset Non-Likuid Lainnya']
      : ['BPJS Ketenagakerjaan', 'Pension Fund', 'Property', 'Vehicle', 'Other Non-Liquid Assets'];
    const L = id ? 'Likuid' : 'Liquid', NL = id ? 'Non-Likuid' : 'Non-Liquid';
    return [
      [{ s: id ? 'Total Aset Likuid' : 'Total Liquid Assets', b: true }, { f: '=SUM(C6:C16)' }],
      [{ s: id ? 'Total Aset Non-Likuid' : 'Total Non-Liquid Assets', b: true }, { f: '=SUM(C17:C21)' }],
      [{ s: id ? 'Total Aset' : 'Total Assets', b: true }, { f: '=B1+B2' }],
      [],
      bold(id ? ['Jenis', 'Kategori', 'Nilai', 'Keterangan', 'Lokasi / Platform', 'Tanggal Update'] : ['Type', 'Category', 'Value', 'Notes', 'Location / Platform', 'Last Updated'])
    ].concat(liq.map(function (c) { return [L, c]; })).concat(non.map(function (c) { return [NL, c]; }));
  }
  const DROPDOWN = [
    ['Uang Saku', 'Cash', 'Makan', 'Cash', 'Likuid', 'Allowance', 'Cash', 'Cash', 'Food', 'Liquid'],
    ['Gaji', 'BCA', 'Transportasi', 'BCA', 'Non-Likuid', 'Salary', 'BCA', 'BCA', 'Transport', 'Non-Liquid'],
    ['Bonus', 'BNI', 'Belanja / Shopping', 'BNI', '', 'Bonus', 'BNI', 'BNI', 'Shopping'],
    ['', 'BRI', 'Tagihan', 'BRI', '', 'Freelance', 'BRI', 'BRI', 'Bills'],
    ['', 'Mandiri', 'Belanja Dapur', 'Mandiri', '', '', 'Mandiri', 'Mandiri', 'Groceries'],
    ['', 'ShopeePay', 'Olahraga', 'ShopeePay', '', '', 'ShopeePay', 'ShopeePay', 'Sports'],
    ['', 'GoPay', 'Kesehatan', 'GoPay', '', '', 'GoPay', 'GoPay', 'Healthcare'],
    ['', 'DANA', 'Pendidikan', 'DANA', '', '', 'DANA', 'DANA', 'Education'],
    ['', 'Jago', 'Amal / Donasi', 'Jago', '', '', 'Jago', 'Jago', 'Charity'],
    ['', 'Sumber Lainnya', 'Hiburan', 'Sumber Lainnya', '', '', 'Other', 'Other', 'Entertainment'],
    ['', '', 'Laundry', '', '', '', '', '', 'Laundry'],
    ['', '', 'Skincare & Makeup', '', '', '', '', '', 'Skincare & Makeup'],
    ['', '', 'Liburan / Travel', '', '', '', '', '', 'Travel'],
    ['', '', 'Hadiah', '', '', '', '', '', 'Gifts'],
    ['', '', 'Elektronik', '', '', '', '', '', 'Electronics'],
    ['', '', 'Listrik', '', '', '', '', '', 'Electricity']
  ];

  async function createFromTemplate(title) {
    let tz = 'Asia/Jakarta';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch (e) { /* */ }
    const TX_ID = bold(['Tanggal', 'Kategori', 'Nominal', 'Keterangan', 'Sumber Dana / Metode Bayar', 'ID']);
    const TX_EN = bold(['Date', 'Category', 'Amount', 'Notes', 'Fund Source / Payment Method']);
    const body = {
      properties: { title: title || 'Catatan Keuangan Money Tracker', locale: 'in_ID', timeZone: tz },
      sheets: [
        sheet(N.income, [TX_ID], { freeze: 1 }), sheet(N.expense, [TX_ID], { freeze: 1 }),
        sheet(N.assets, assetRows('id'), { rows: 60 }),
        sheet('Income', [TX_EN], { freeze: 1 }), sheet('Expenses', [TX_EN], { freeze: 1 }),
        sheet(N.assetsEn, assetRows('en'), { rows: 60 }),
        sheet(N.options, DROPDOWN, { rows: 60 })
      ]
    };
    // Kode bahasa Indonesia di Google Sheets adalah "in_ID" (kode lama Java).
    // Kalau ditolak, buat tanpa setelan bahasa (format Rp tetap dipasang manual).
    let res;
    try {
      res = await req(SHEETS_API, { method: 'POST', body: body });
    } catch (e) {
      if (!/locale/i.test(e.message || '')) throw e;
      delete body.properties.locale;
      res = await req(SHEETS_API, { method: 'POST', body: body });
    }
    sheetId = res.spreadsheetId;
    LS.set('mt.sheetId', sheetId);
    const ids = {};
    res.sheets.forEach(function (s) { ids[s.properties.title] = s.properties.sheetId; });
    const r = function (title, r1, c1, r2, c2) { return { sheetId: ids[title], startRowIndex: r1, endRowIndex: r2, startColumnIndex: c1, endColumnIndex: c2 }; };
    const fmt = function (range, f) { return { repeatCell: { range: range, cell: { userEnteredFormat: { numberFormat: f } }, fields: 'userEnteredFormat.numberFormat' } }; };
    const dv = function (range, src) { return { setDataValidation: { range: range, rule: { condition: { type: 'ONE_OF_RANGE', values: [{ userEnteredValue: "='" + N.options + "'!$" + src + '$1:$' + src + '$60' }] }, strict: false, showCustomUi: true } } }; };
    const width = function (title, i, px) { return { updateDimensionProperties: { range: { sheetId: ids[title], dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: px }, fields: 'pixelSize' } }; };
    const reqs = [];
    [[N.income, 'A', 'B'], [N.expense, 'C', 'D'], ['Income', 'F', 'G'], ['Expenses', 'I', 'H']].forEach(function (x) {
      reqs.push(fmt(r(x[0], 1, 0, 1000, 1), DATE_FMT), fmt(r(x[0], 1, 2, 1000, 3), MONEY_FMT));
      reqs.push(dv(r(x[0], 1, 1, 1000, 2), x[1]), dv(r(x[0], 1, 4, 1000, 5), x[2]));
      [110, 170, 130, 240, 210, 150].forEach(function (px, i) { reqs.push(width(x[0], i, px)); });
    });
    [[N.assets, 'E'], [N.assetsEn, 'J']].forEach(function (x) {
      reqs.push(fmt(r(x[0], 0, 1, 3, 2), MONEY_FMT), fmt(r(x[0], 5, 2, 21, 3), MONEY_FMT), fmt(r(x[0], 5, 5, 21, 6), DATE_FMT));
      reqs.push(dv(r(x[0], 5, 0, 21, 1), x[1]));
      [170, 190, 140, 200, 170, 130].forEach(function (px, i) { reqs.push(width(x[0], i, px)); });
    });
    await batchUpdate(reqs);
    meta = null;
    Object.keys(maps).forEach(function (k) { delete maps[k]; });
    return sheetId;
  }

  async function listSheets() {
    const p = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id,name,modifiedTime)', orderBy: 'modifiedTime desc', pageSize: '20'
    });
    const d = await req(DRIVE_API + '?' + p.toString());
    return d.files || [];
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) return resolve();
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = resolve; s.onerror = function () { reject(fail('NETWORK')); };
      document.head.appendChild(s);
    });
  }
  /** Pemilih file Google Drive, untuk memakai spreadsheet yang sudah ada. */
  async function pick(lang) {
    if (!C.GOOGLE_API_KEY || !C.GOOGLE_APP_ID) throw fail('NO_PICKER');
    if (!hasToken()) throw fail('AUTH_REQUIRED');
    await loadScript('https://apis.google.com/js/api.js');
    await new Promise(function (r) { window.gapi.load('picker', r); });
    const G = window.google.picker;
    return new Promise(function (resolve) {
      const view = new G.DocsView(G.ViewId.SPREADSHEETS).setMode(G.DocsViewMode.LIST);
      new G.PickerBuilder().addView(view).setOAuthToken(auth.token).setDeveloperKey(C.GOOGLE_API_KEY).setAppId(C.GOOGLE_APP_ID)
        .setLocale(lang === 'en' ? 'en' : 'id').setOrigin(location.origin)
        .setCallback(function (d) {
          if (d.action === G.Action.PICKED) resolve(d.docs[0].id);
          else if (d.action === G.Action.CANCEL) resolve(null);
        }).build().setVisible(true);
    });
  }

  function useSheet(id) { sheetId = id || ''; meta = null; Object.keys(maps).forEach(function (k) { delete maps[k]; }); if (id) LS.set('mt.sheetId', id); else LS.del('mt.sheetId'); }

  /* ---------------- antarmuka yang dipakai app.js ---------------- */
  async function call(action, payload) {
    payload = payload || {};
    switch (action) {
      case 'bootstrap': return { ok: true, data: await bootstrap() };
      case 'add': return { ok: true, tx: await add(payload.tx) };
      case 'update': return { ok: true, tx: await update(payload.tx) };
      case 'delete': return { ok: true, id: await remove(payload.id, payload.type) };
      case 'updateAsset': return { ok: true, asset: await updateAsset(payload.asset) };
    }
    throw fail('BAD_ACTION');
  }

  return {
    call: call, isConfigured: isConfigured, hasToken: hasToken, signIn: signIn, signOut: signOut,
    consumeRedirect: consumeRedirect, canSilentRefresh: canSilentRefresh, fetchEmail: fetchEmail,
    email: function () { return email; }, sheetId: function () { return sheetId; }, useSheet: useSheet,
    createFromTemplate: createFromTemplate, listSheets: listSheets, pick: pick,
    isNetworkError: function (e) { return e && (e.code === 'NETWORK' || e.code === 'OFFLINE'); }
  };
})();
