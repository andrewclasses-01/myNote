// editor.js — MÀN VIẾT VẼ (giống Notability): trang dọc cuộn liên tục, thanh công cụ nổi ở giữa trên.
//
// ⭐ Ngón tay / Apple Pencil: mặc định NGÓN TAY = CUỘN + chụm phóng to, BÚT = viết (chống tì lòng bàn tay: bút đang chạm thì
//   bỏ qua mọi ngón). Nút bàn tay trên thanh công cụ bật "ngón tay vẽ" cho lúc không có bút. Chuột = viết, lăn chuột = cuộn,
//   Ctrl + lăn = phóng to.
// ⭐ Trang chỉ có canvas khi ở gần màn hình (trang xa bị gỡ canvas) ⇒ ghi chú dài vẫn nhẹ bộ nhớ iPad.
// ⭐ Nét đang viết vẽ trên 1 canvas phủ riêng (chỉ vẽ phần mới), nhấc bút mới in vào canvas trang.
import { db, uid } from "./db.js";
import { icon } from "./icons.js";
import { PAGE_W, drawStroke, renderPage, strokeBox } from "./ink.js";
import { getImg, makeThumb, newPage, blobDataUrl } from "./pages.js";
import { createLiveSender, LIVE_TEXT, LIVE_LOCAL } from "./live.js";
import { getUser, currentUser, signIn } from "./firebase.js";
import { popMenu, toast, askConfirm, esc } from "./ui.js";

const TOOLS = [
  ["pen", "pen", "Bút"], ["hl", "highlighter", "Bút dạ quang"], ["eraser", "eraser", "Tẩy"],
  ["lasso", "lasso", "Chọn vùng (lasso)"], ["text", "type", "Gõ chữ"], ["laser", "laser", "Bút laser"],
];
const PRESETS = {
  pen: ["#1f2937", "#e11d48", "#2563eb", "#16a34a", "#f59e0b"],
  hl: ["#fde047", "#86efac", "#f9a8d4", "#93c5fd", "#fdba74"],
  text: ["#1f2937", "#e11d48", "#2563eb", "#16a34a", "#7c3aed"],
  laser: ["#ff2d55", "#22c55e", "#3b82f6"],
};
const SIZES = { pen: [1.8, 3.2, 5.5], hl: [14, 22, 32], eraser: [10, 22, 44], text: [22, 30, 42] };
const SET_KEY = "mynote.tools";
const MIN_Z = 0.6, MAX_Z = 3;

function loadSet() {
  const d = { tool: "pen", finger: false, pen: { c: PRESETS.pen[0], wi: 1 }, hl: { c: PRESETS.hl[0], wi: 1 }, eraser: { wi: 1, mode: "stroke" }, text: { c: PRESETS.text[0], wi: 1 }, laser: { c: PRESETS.laser[0] } };
  try { const s = JSON.parse(localStorage.getItem(SET_KEY)); if (s) for (const k in d) if (s[k] != null) d[k] = typeof d[k] === "object" ? { ...d[k], ...s[k] } : s[k]; } catch (e) { /* */ }
  return d;
}

const mctx = document.createElement("canvas").getContext("2d");   // chỉ để đo chữ

export async function openEditor(root, id) {
  const meta = await db.get("notes", id);
  const doc = await db.get("docs", id);
  if (!meta || !doc) { location.hash = ""; return null; }

  const set = loadSet();
  const saveSet = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(set)); } catch (e) { /* */ } };

  root.innerHTML = `
  <div class="ed">
    <header class="ed-top">
      <div class="ed-left">
        <button class="icon-btn round" data-act="back" title="Thư viện">${icon("back")}</button>
        <input class="ed-title" value="${esc(meta.title)}" spellcheck="false">
      </div>
      <div class="palette">
        <div class="tools"></div><i class="sep"></i><div class="colors"></div><i class="sep"></i><div class="sizes"></div><i class="sep"></i>
        <button class="tool finger" title="Ngón tay vẽ (khi không có bút)">${icon("hand")}</button>
      </div>
      <div class="ed-right">
        <button class="icon-btn round" data-act="undo" title="Hoàn tác">${icon("undo")}</button>
        <button class="icon-btn round" data-act="redo" title="Làm lại">${icon("redo")}</button>
        <button class="live-btn" data-act="live" title="Truyền trực tiếp lên nút NOTE của AWord">${icon("cast")}<span>LIVE</span></button>
        <button class="icon-btn round" data-act="more" title="Thêm">${icon("more")}</button>
      </div>
    </header>
    <div class="wrap"><div class="inner"></div></div>
    <canvas class="live-layer"></canvas>
    <canvas class="laser-layer"></canvas>
    <div class="pager"><button data-act="pgUp">${icon("up")}</button><span class="pg-n"></span><button data-act="pgDown">${icon("down")}</button></div>
    <div class="zoom-badge"></div>
  </div>`;

  const $ = s => root.querySelector(s);
  const wrap = $(".wrap"), inner = $(".inner"), laserCv = $(".laser-layer"), lctx = laserCv.getContext("2d");
  const pgN = $(".pg-n"), zoomBadge = $(".zoom-badge"), liveBtn = $('[data-act="live"]');

  // ------------------------------------------------------------------ trang
  let zoom = 1;
  let pv = [];                        // [{ el, cv, ctx, k }]
  const overlay = document.createElement("canvas");
  overlay.className = "overlay";
  const octx = overlay.getContext("2d");
  let overlayPi = -1;

  function buildPages() {
    inner.innerHTML = "";
    pv = doc.pages.map((pg, i) => {
      const el = document.createElement("div");
      el.className = "page";
      el.dataset.i = i;
      inner.append(el);
      return { el, cv: null, ctx: null, k: 0 };
    });
    const add = document.createElement("button");
    add.className = "add-page";
    add.innerHTML = `${icon("plus")}<span>Thêm trang</span>`;
    add.onclick = () => addPage(doc.pages.length);
    inner.append(add);
    overlayPi = -1;
    layout();
  }

  function baseW() { return Math.min(wrap.clientWidth - 48, 1500); }

  function layout() {
    const w = baseW() * zoom;
    const pad = 24 * zoom;
    inner.style.width = Math.max(wrap.clientWidth, w + pad * 2) + "px";
    inner.style.paddingLeft = inner.style.paddingRight = pad + "px";
    doc.pages.forEach((pg, i) => {
      const s = pv[i].el.style;
      s.width = w + "px";
      s.height = (w * pg.h) / PAGE_W + "px";
      s.marginBottom = 22 * zoom + "px";
    });
  }

  function wantK(i) {
    const w = baseW() * zoom, h = (w * doc.pages[i].h) / PAGE_W;
    let r = Math.min(window.devicePixelRatio || 1, 2);
    if (w * h * r * r > 9e6) r = Math.sqrt(9e6 / (w * h));    // trần ~9 triệu điểm ảnh mỗi trang (giới hạn canvas iPad)
    return (w * r) / PAGE_W;
  }

  function renderPv(i) {
    const v = pv[i];
    if (!v || !v.ctx) return;
    const pg = doc.pages[i];
    v.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const skip = sel && sel.pi === i && sel.moving ? sel.ids : null;
    getImg(pg.img).then(img => {
      if (!v.ctx) return;
      renderPage(v.ctx, pg, v.k, img, skip);
      if (editingText && editingText.pi === i) { /* chữ đang sửa đã bị gỡ khỏi strokes, không vẽ */ }
    });
  }

  let renderQ = new Set(), renderRaf = 0;
  function queueRender(i) {
    renderQ.add(i);
    if (!renderRaf) renderRaf = requestAnimationFrame(() => { renderRaf = 0; const q = [...renderQ]; renderQ.clear(); q.forEach(renderPv); });
  }

  function refreshVisible() {
    const top = wrap.scrollTop - wrap.clientHeight * 0.75, bot = wrap.scrollTop + wrap.clientHeight * 1.75;
    pv.forEach((v, i) => {
      const y0 = v.el.offsetTop, y1 = y0 + v.el.offsetHeight;
      const near = y1 > top && y0 < bot;
      if (near) {
        const k = wantK(i);
        if (!v.cv) {
          v.cv = document.createElement("canvas");
          v.cv.className = "ink";
          v.ctx = v.cv.getContext("2d", { alpha: false });
          v.el.prepend(v.cv);
          v.k = 0;
        }
        if (Math.abs(v.k - k) > 1e-3) {
          v.k = k;
          v.cv.width = Math.round(PAGE_W * k);
          v.cv.height = Math.round(doc.pages[i].h * k);
          renderPv(i);
        }
      } else if (v.cv && i !== overlayPi) {
        v.cv.width = v.cv.height = 0;   // nhả bộ nhớ ngay (Safari giữ canvas lâu nếu chỉ gỡ khỏi DOM)
        v.cv.remove(); v.cv = v.ctx = null; v.k = 0;
      }
    });
  }

  function placeOverlay(i) {
    const v = pv[i];
    if (overlayPi !== i || overlay.width !== v.cv.width || overlay.height !== v.cv.height) {
      overlay.width = v.cv.width; overlay.height = v.cv.height;
      v.el.append(overlay);
      overlayPi = i;
    }
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, overlay.width, overlay.height);
  }
  const clearOverlay = () => { octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, overlay.width, overlay.height); overlay.classList.remove("hl"); };

  function pageAt(cx, cy) {
    for (let i = 0; i < pv.length; i++) {
      const r = pv[i].el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return { i, r };
    }
    return null;
  }
  const toUnit = (r, cx, cy) => ({ x: ((cx - r.left) * PAGE_W) / r.width, y: ((cy - r.top) * PAGE_W) / r.width });

  function currentPage() {
    const mid = wrap.getBoundingClientRect().top + wrap.clientHeight / 2;
    let best = 0, bd = 1e9;
    pv.forEach((v, i) => {
      const r = v.el.getBoundingClientRect();
      const d = mid < r.top ? r.top - mid : mid > r.bottom ? mid - r.bottom : 0;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  // ------------------------------------------------------------------ lịch sử + lưu
  const undoS = [], redoS = [];
  const snap = pi => { undoS.push({ pi, strokes: doc.pages[pi].strokes.slice() }); if (undoS.length > 200) undoS.shift(); redoS.length = 0; updUR(); };
  const copyPages = () => doc.pages.map(p => ({ ...p, strokes: p.strokes.slice() }));
  const snapPages = () => { undoS.push({ pages: copyPages() }); redoS.length = 0; updUR(); };
  function restore(it, into) {
    if (it.pages) { into.push({ pages: copyPages() }); doc.pages = it.pages; buildPages(); refreshVisible(); liveAll(); }
    else { into.push({ pi: it.pi, strokes: doc.pages[it.pi].strokes.slice() }); doc.pages[it.pi].strokes = it.strokes; queueRender(it.pi); livePage(it.pi); }
    clearSel(); dirty(); updUR();
  }
  const doUndo = () => { const it = undoS.pop(); if (it) restore(it, redoS); };
  const doRedo = () => { const it = redoS.pop(); if (it) restore(it, undoS); };
  function updUR() { $('[data-act="undo"]').disabled = !undoS.length; $('[data-act="redo"]').disabled = !redoS.length; }

  // ⭐ v0.3.0 — lưu (chép cả ghi chú vào IndexedDB) chạy trên luồng chính ⇒ KHÔNG lưu khi bút đang chạm hay vừa nhấc < 1,2 s
  //   (cũ: lưu 0,8 s sau mỗi nét = đúng lúc đang viết nét kế ⇒ giật). Ảnh thu nhỏ chỉ dựng lúc rời màn / ẩn app (full).
  let saveT = 0, saving = null, lastInput = 0, thumbDirty = false;
  function dirty() { thumbDirty = true; clearTimeout(saveT); saveT = setTimeout(save, 1500); }
  async function save(full) {
    clearTimeout(saveT); saveT = 0;
    if (full !== true && (active || performance.now() - lastInput < 1200)) { saveT = setTimeout(save, 900); return; }
    meta.updated = Date.now();
    meta.pages = doc.pages.length;
    meta.title = $(".ed-title").value.trim() || "Ghi chú";
    saving = (async () => {
      await db.put("docs", doc);
      if (full === true && thumbDirty) { thumbDirty = false; try { meta.thumb = await makeThumb(doc.pages[0]); } catch (e) { /* */ } }
      await db.put("notes", meta);
    })();
    await saving;
  }

  // ------------------------------------------------------------------ thanh công cụ
  function paintPalette() {
    const tools = $(".tools"), colors = $(".colors"), sizes = $(".sizes");
    tools.innerHTML = TOOLS.map(([k, ic, t]) => `<button class="tool ${set.tool === k ? "on" : ""}" data-tool="${k}" title="${t}">${icon(ic)}${k === "pen" || k === "hl" ? `<i class="tip" style="background:${set[k].c}"></i>` : ""}</button>`).join("");
    tools.querySelectorAll("[data-tool]").forEach(b => (b.onclick = () => {
      if (set.tool === b.dataset.tool && b.dataset.tool === "eraser") return eraserMenu(b);
      set.tool = b.dataset.tool; saveSet(); clearSel(); commitText(); paintPalette();
    }));
    const t = set.tool, pre = PRESETS[t];
    colors.innerHTML = pre ? pre.map(c => `<button class="sw ${set[t].c === c ? "on" : ""}" data-c="${c}" style="--c:${c}"></button>`).join("") +
      `<label class="sw custom ${pre.includes(set[t].c) ? "" : "on"}" style="--c:${pre.includes(set[t].c) ? "#fff" : set[t].c}" title="Màu khác">${icon("plus")}<input type="color" value="${set[t].c}"></label>` :
      t === "eraser" ? `<button class="chip" data-emode>${set.eraser.mode === "stroke" ? "Tẩy cả nét" : "Tẩy từng phần"}</button>` : `<span class="hint">${t === "lasso" ? "Khoanh vùng để chọn, kéo để di chuyển" : ""}</span>`;
    colors.querySelectorAll("[data-c]").forEach(b => (b.onclick = () => { set[t].c = b.dataset.c; saveSet(); applySelColor(); paintPalette(); }));
    const ci = colors.querySelector('input[type="color"]');
    if (ci) ci.onchange = () => { set[t].c = ci.value; saveSet(); applySelColor(); paintPalette(); };
    const em = colors.querySelector("[data-emode]");
    if (em) em.onclick = () => eraserMenu(em);
    const sz = SIZES[t];
    sizes.innerHTML = sz ? sz.map((w, i) => `<button class="size ${set[t].wi === i ? "on" : ""}" data-wi="${i}"><i style="--d:${[6, 10, 15][i]}px"></i></button>`).join("") : "";
    sizes.querySelectorAll("[data-wi]").forEach(b => (b.onclick = () => { set[t].wi = +b.dataset.wi; saveSet(); paintPalette(); }));
    $(".finger").classList.toggle("on", set.finger);
    wrap.dataset.tool = t;
  }
  function eraserMenu(b) {
    const r = b.getBoundingClientRect();
    popMenu(r.left, r.bottom + 8, [
      { label: "Tẩy cả nét", on: set.eraser.mode === "stroke", onClick: () => { set.eraser.mode = "stroke"; saveSet(); paintPalette(); } },
      { label: "Tẩy từng phần", on: set.eraser.mode === "part", onClick: () => { set.eraser.mode = "part"; saveSet(); paintPalette(); } },
    ]);
  }
  $(".finger").onclick = () => { set.finger = !set.finger; saveSet(); paintPalette(); toast(set.finger ? "Ngón tay: VẼ (2 ngón để cuộn)" : "Ngón tay: CUỘN — chỉ bút mới viết"); };

  // ------------------------------------------------------------------ nét bút
  let active = null;          // nét/thao tác đang chạy: { pid, pi, r, kind, ... }
  let penDown = false, penSeen = false;

  // ⭐ v0.3.0 — LỚP NÉT ĐANG VIẾT = một canvas CỠ MÀN HÌNH đè lên khung cuộn. Cũ: canvas phủ cỡ CẢ TRANG (~7 triệu điểm ảnh ở ×2)
  //   ⇒ iPad xoá + ghép lớp khổng lồ mỗi khung = giật. Vẽ theo toạ độ trang qua setTransform; nhấc bút thì in vào canvas trang.
  const liveCv = $(".live-layer");
  const lv = liveCv.getContext("2d", { desynchronized: true });
  let lt = null;   // { k, ox, oy, w, h, dpr } của trang đang viết
  function liveBegin(pi, hl) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), W = liveCv.clientWidth, H = liveCv.clientHeight;
    if (liveCv.width !== Math.round(W * dpr) || liveCv.height !== Math.round(H * dpr)) { liveCv.width = Math.round(W * dpr); liveCv.height = Math.round(H * dpr); }
    const r = pv[pi].el.getBoundingClientRect(), b = liveCv.getBoundingClientRect();
    lt = { k: r.width / PAGE_W, ox: r.left - b.left, oy: r.top - b.top, w: r.width, h: r.height, dpr };
    liveCv.classList.toggle("hl", !!hl);
  }
  let lvBox = null;   // vùng (px thiết bị) đã vẽ khung trước ⇒ chỉ xoá vùng đó, không xoá cả lớp
  function liveClear() { lv.setTransform(1, 0, 0, 1, 0, 0); lv.clearRect(0, 0, liveCv.width, liveCv.height); lvBox = null; }

  function startStroke(pi, r, e) {
    const t = set.tool;
    const s = { id: uid(), t, c: set[t].c, w: SIZES[t][set[t].wi], pr: e.pointerType === "pen", p: [] };
    active = { pid: e.pointerId, pi, r, kind: "stroke", s, raw: null, pred: null };
    liveBegin(pi, t === "hl");
    live({ k: "s0", pi, s: { id: s.id, t: s.t, c: s.c, w: s.w, pr: s.pr } });
    addPts(e);
  }

  function evPts(e) {
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    return list && list.length ? list : [e];
  }

  // ⭐ v0.3.0 — LÀM MƯỢT lúc thu điểm (streamline): điểm lưu = điểm trước + 60 % quãng tới điểm thật ⇒ hết răng cưa do tay run /
  //   cảm biến nhiễu; lực nhấn đổi dần (35 %/điểm) ⇒ độ dày không nhảy cục. Lúc vẽ luôn nối thêm điểm THẬT cuối cùng (+ điểm
  //   đoán trước nếu trình duyệt có) ⇒ mực bám sát đầu bút, không bị "đuổi theo".
  const SLOW = { pen: 0.4, mouse: 0.3, touch: 0.45 };
  function addPts(e) {
    const a = active, s = a.s, fresh = [], sl = SLOW[e.pointerType] ?? 0.4;
    for (const ev of evPts(e)) {
      const { x, y } = toUnit(a.r, ev.clientX, ev.clientY);
      const rp = s.pr ? Math.max(0.08, ev.pressure || 0.5) : 0.5;
      a.raw = [x, y, rp];
      const n = s.p.length;
      let px = x, py = y, pp = rp;
      if (n) {
        const lx = s.p[n - 3], ly = s.p[n - 2], lp = s.p[n - 1];
        px = lx + (x - lx) * (1 - sl); py = ly + (y - ly) * (1 - sl); pp = lp + (rp - lp) * 0.35;
        if (Math.hypot(px - lx, py - ly) < 0.4) continue;
      }
      const xr = Math.round(px * 10) / 10, yr = Math.round(py * 10) / 10, prr = Math.round(pp * 100) / 100;
      s.p.push(xr, yr, prr); fresh.push(xr, yr, prr);
    }
    a.pred = null;
    if (e.getPredictedEvents && s.t === "pen") {
      const pe = e.getPredictedEvents();
      if (pe && pe.length) { const q = pe[pe.length - 1], u = toUnit(a.r, q.clientX, q.clientY); a.pred = [u.x, u.y, a.raw ? a.raw[2] : 0.5]; }
    }
    if (fresh.length) live({ k: "s+", id: s.id, p: fresh });
    drawLive();
  }

  let liveRaf = 0;
  function drawLive() {
    if (liveRaf) return;
    liveRaf = requestAnimationFrame(() => {
      liveRaf = 0;
      const a = active;
      if (!a || a.kind !== "stroke" || !lt) return;
      const s = a.s;
      let pts = s.p;
      if (a.raw || a.pred) {
        pts = s.p.slice();
        if (a.raw && pts.length) { const n = pts.length; if (Math.hypot(a.raw[0] - pts[n - 3], a.raw[1] - pts[n - 2]) > 0.4) pts.push(a.raw[0], a.raw[1], pts[n - 1]); }
        if (a.pred) pts.push(a.pred[0], a.pred[1], pts[pts.length - 1]);
      }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < pts.length; i += 3) { const x = pts[i], y = pts[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const m = s.w * 1.4 + 3, f = lt.k * lt.dpr;
      const box = [Math.floor(lt.dpr * lt.ox + (x0 - m) * f), Math.floor(lt.dpr * lt.oy + (y0 - m) * f), Math.ceil(lt.dpr * lt.ox + (x1 + m) * f), Math.ceil(lt.dpr * lt.oy + (y1 + m) * f)];
      lv.setTransform(1, 0, 0, 1, 0, 0);
      const cb = lvBox ? [Math.min(lvBox[0], box[0]), Math.min(lvBox[1], box[1]), Math.max(lvBox[2], box[2]), Math.max(lvBox[3], box[3])] : box;
      lv.clearRect(cb[0], cb[1], cb[2] - cb[0], cb[3] - cb[1]);
      lvBox = box;
      lv.setTransform(lt.dpr, 0, 0, lt.dpr, lt.dpr * lt.ox, lt.dpr * lt.oy);
      lv.save();
      lv.beginPath(); lv.rect(0, 0, lt.w, lt.h); lv.clip();
      drawStroke(lv, pts === s.p ? s : { ...s, p: pts }, lt.k);
      lv.restore();
    });
  }

  function densify(p, step) {
    const out = [p[0], p[1], p[2]];
    for (let i = 3; i < p.length; i += 3) {
      const x0 = p[i - 3], y0 = p[i - 2], q0 = p[i - 1], x1 = p[i], y1 = p[i + 1], q1 = p[i + 2];
      const d = Math.hypot(x1 - x0, y1 - y0), m = Math.floor(d / step);
      for (let j = 1; j <= m; j++) { const t = j / (m + 1); out.push(Math.round((x0 + (x1 - x0) * t) * 10) / 10, Math.round((y0 + (y1 - y0) * t) * 10) / 10, q0 + (q1 - q0) * t); }
      out.push(x1, y1, q1);
    }
    return out;
  }

  function endStroke() {
    const a = active, s = a.s, pg = doc.pages[a.pi], v = pv[a.pi];
    if (liveRaf) { cancelAnimationFrame(liveRaf); liveRaf = 0; }
    if (!s.p.length) { liveClear(); return; }
    // nét kết thúc ĐÚNG chỗ nhấc bút (điểm làm mượt luôn trễ sau điểm thật một chút)
    const n = s.p.length;
    if (a.raw && Math.hypot(a.raw[0] - s.p[n - 3], a.raw[1] - s.p[n - 2]) > 0.4) s.p.push(Math.round(a.raw[0] * 10) / 10, Math.round(a.raw[1] * 10) / 10, s.p[n - 1]);
    s.p = densify(s.p, s.t === "hl" ? 6 : 3);
    snap(a.pi);
    pg.strokes.push(s);
    if (v.ctx) drawStroke(v.ctx, s, v.k);   // in vào trang TRƯỚC rồi mới xoá lớp nét ⇒ không chớp
    liveClear(); lt = null;
    live({ k: "s1", id: s.id, s });
    dirty();
  }

  // ------------------------------------------------------------------ tẩy
  function segD2(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
    let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const x = ax + t * dx - px, y = ay + t * dy - py;
    return x * x + y * y;
  }
  function hitStroke(s, x, y, r) {
    const b = strokeBox(mctx, s);
    if (x < b.x - r || x > b.x + b.w + r || y < b.y - r || y > b.y + b.h + r) return false;
    if (s.t === "text") return true;
    const p = s.p, rr = (r + s.w / 2) ** 2;
    if (p.length === 3) return (p[0] - x) ** 2 + (p[1] - y) ** 2 <= rr;
    for (let i = 3; i < p.length; i += 3) if (segD2(x, y, p[i - 3], p[i - 2], p[i], p[i + 1]) <= rr) return true;
    return false;
  }
  function eraseAt(x, y) {
    const a = active, pg = doc.pages[a.pi], r = SIZES.eraser[set.eraser.wi] / 2;
    let changed = false;
    const out = [];
    for (const s of pg.strokes) {
      // chữ gõ KHÔNG bị tẩy (như Notability) — xoá chữ bằng lasso hoặc chạm vào chữ để sửa
      if (s.t === "text" || !hitStroke(s, x, y, r)) { out.push(s); continue; }
      if (set.eraser.mode === "stroke") { changed = true; continue; }
      // tẩy từng phần: cắt nét thành các khúc nằm ngoài vòng tẩy
      const rr = (r + s.w * 0.35) ** 2, runs = [];
      let cur = [];
      for (let i = 0; i < s.p.length; i += 3) {
        if ((s.p[i] - x) ** 2 + (s.p[i + 1] - y) ** 2 <= rr) { if (cur.length) runs.push(cur); cur = []; }
        else cur.push(s.p[i], s.p[i + 1], s.p[i + 2]);
      }
      if (cur.length) runs.push(cur);
      if (runs.length === 1 && runs[0].length === s.p.length) { out.push(s); continue; }   // vòng tẩy lọt giữa 2 điểm — chưa chạm
      changed = true;
      for (const pp of runs) if (pp.length >= 6) out.push({ ...s, id: uid(), p: pp });
    }
    if (!changed) return;
    if (!a.snapped) { snap(a.pi); a.snapped = true; }
    pg.strokes = out;
    queueRender(a.pi);
    a.changed = true;
  }
  function drawEraserRing(x, y) {
    const a = active, k = pv[a.pi].k, r = SIZES.eraser[set.eraser.wi] / 2;
    clearOverlay();
    octx.beginPath(); octx.arc(x * k, y * k, r * k, 0, 6.2832);
    octx.fillStyle = "rgba(148,163,184,.18)"; octx.fill();
    octx.lineWidth = 1.5; octx.strokeStyle = "rgba(71,85,105,.7)"; octx.stroke();
  }

  // ------------------------------------------------------------------ lasso / vùng chọn
  let sel = null;   // { pi, ids:Set, box, el, moving, dx, dy }
  function clearSel() { if (sel) { sel.el && sel.el.remove(); sel = null; } }
  function inPoly(x, y, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      const xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function drawLassoPath(poly) {
    const k = pv[active.pi].k;
    clearOverlay();
    octx.beginPath();
    for (let i = 0; i < poly.length; i += 2) octx[i ? "lineTo" : "moveTo"](poly[i] * k, poly[i + 1] * k);
    octx.closePath();
    octx.fillStyle = "rgba(37,99,235,.06)"; octx.fill();
    octx.setLineDash([6, 5]); octx.lineWidth = 1.6; octx.strokeStyle = "#2563eb"; octx.stroke(); octx.setLineDash([]);
  }
  function finishLasso(poly) {
    clearOverlay();
    const pg = doc.pages[active.pi], ids = new Set();
    if (poly.length >= 6) for (const s of pg.strokes) {
      if (s.t === "text") { const b = strokeBox(mctx, s); if (inPoly(b.x + b.w / 2, b.y + b.h / 2, poly)) ids.add(s.id); continue; }
      let inside = 0;
      for (let i = 0; i < s.p.length; i += 3) if (inPoly(s.p[i], s.p[i + 1], poly)) inside++;
      if (inside / (s.p.length / 3) >= 0.5) ids.add(s.id);
    }
    if (!ids.size) return;
    sel = { pi: active.pi, ids };
    paintSel();
  }
  function selBox() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const s of doc.pages[sel.pi].strokes) if (sel.ids.has(s.id)) {
      const b = strokeBox(mctx, s);
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
    }
    return { x: x0 - 8, y: y0 - 8, w: x1 - x0 + 16, h: y1 - y0 + 16 };
  }
  function paintSel() {
    if (sel.el) sel.el.remove();
    const b = (sel.box = selBox()), pg = doc.pages[sel.pi];
    const el = document.createElement("div");
    el.className = "sel";
    el.style.cssText = `left:${(b.x / PAGE_W) * 100}%;top:${(b.y / pg.h) * 100}%;width:${(b.w / PAGE_W) * 100}%;height:${(b.h / pg.h) * 100}%`;
    el.innerHTML = `<div class="sel-menu"><button data-s="del">${icon("trash")}<span>Xoá</span></button><button data-s="color">${icon("palette")}<span>Tô màu bút</span></button><button data-s="dup">${icon("copy")}<span>Nhân bản</span></button></div>`;
    el.querySelector(".sel-menu").addEventListener("pointerdown", e => e.stopPropagation());
    el.querySelector('[data-s="del"]').onclick = () => { snap(sel.pi); const pi = sel.pi; doc.pages[pi].strokes = pg.strokes.filter(s => !sel.ids.has(s.id)); clearSel(); queueRender(pi); livePage(pi); dirty(); };
    el.querySelector('[data-s="color"]').onclick = () => applySelColor(true);
    el.querySelector('[data-s="dup"]').onclick = () => {
      snap(sel.pi);
      const copies = pg.strokes.filter(s => sel.ids.has(s.id)).map(s => moved(s, 24, 24, uid()));
      pg.strokes.push(...copies);
      sel.ids = new Set(copies.map(s => s.id));
      queueRender(sel.pi); livePage(sel.pi); paintSel(); dirty();
    };
    pv[sel.pi].el.append(el);
    sel.el = el;
  }
  function applySelColor(force) {
    if (!sel || (!force && set.tool !== "lasso")) return;
    const c = set.pen.c, pg = doc.pages[sel.pi];
    snap(sel.pi);
    pg.strokes = pg.strokes.map(s => (sel.ids.has(s.id) && s.t !== "hl" ? { ...s, c } : s));
    queueRender(sel.pi); livePage(sel.pi); dirty();
  }
  function moved(s, dx, dy, newId) {
    if (s.t === "text") return { ...s, id: newId || s.id, x: s.x + dx, y: s.y + dy };
    const p = s.p.slice();
    for (let i = 0; i < p.length; i += 3) { p[i] = Math.round((p[i] + dx) * 10) / 10; p[i + 1] = Math.round((p[i + 1] + dy) * 10) / 10; }
    return { ...s, id: newId || s.id, p };
  }
  function drawMoving() {
    const k = pv[sel.pi].k;
    clearOverlay();
    for (const s of doc.pages[sel.pi].strokes) if (sel.ids.has(s.id)) drawStroke(octx, s, k, sel.dx, sel.dy);
    sel.el.style.transform = `translate(${(sel.dx / PAGE_W) * pv[sel.pi].el.clientWidth}px, ${(sel.dy / PAGE_W) * pv[sel.pi].el.clientWidth}px)`;
  }
  function endMove() {
    const pi = sel.pi, pg = doc.pages[pi];
    sel.moving = false;
    clearOverlay();
    sel.el.style.transform = "";
    if (Math.abs(sel.dx) + Math.abs(sel.dy) > 0.5) {
      snap(pi);
      pg.strokes = pg.strokes.map(s => (sel.ids.has(s.id) ? moved(s, sel.dx, sel.dy) : s));
      livePage(pi); dirty();
    }
    queueRender(pi);
    paintSel();
  }

  // ------------------------------------------------------------------ gõ chữ
  let editingText = null;   // { pi, s, ta, orig }
  function openText(pi, x, y) {
    commitText();
    const pg = doc.pages[pi];
    const hit = [...pg.strokes].reverse().find(s => s.t === "text" && hitStroke(s, x, y, 4));
    let s;
    if (hit) {
      snap(pi);
      pg.strokes = pg.strokes.filter(t => t !== hit);
      s = { ...hit };
      queueRender(pi); livePage(pi);
    } else s = { id: uid(), t: "text", x: Math.min(x, PAGE_W - 160), y: Math.max(0, y - SIZES.text[set.text.wi] * 0.65), s: SIZES.text[set.text.wi], c: set.text.c, text: "" };
    const v = pv[pi], cssK = v.el.clientWidth / PAGE_W;
    const ta = document.createElement("textarea");
    ta.className = "text-edit";
    ta.value = s.text;
    ta.spellcheck = false;
    ta.style.cssText = `left:${s.x * cssK}px;top:${s.y * cssK}px;width:${(PAGE_W - s.x - 40) * cssK}px;font-size:${s.s * cssK}px;color:${s.c}`;
    const grow = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; };
    ta.oninput = grow;
    ta.addEventListener("pointerdown", e => e.stopPropagation());
    ta.onkeydown = e => { if (e.key === "Escape") ta.blur(); };
    ta.onblur = () => setTimeout(commitText, 0);
    v.el.append(ta);
    editingText = { pi, s, ta, was: !!hit };
    grow();
    setTimeout(() => ta.focus(), 30);
  }
  function commitText() {
    const e = editingText;
    if (!e) return;
    editingText = null;
    const txt = e.ta.value.replace(/\s+$/, "");
    e.ta.remove();
    if (!txt) { if (e.was) dirty(); return; }
    if (!e.was) snap(e.pi);
    doc.pages[e.pi].strokes.push({ ...e.s, text: txt });
    queueRender(e.pi); livePage(e.pi); dirty();
  }

  // ------------------------------------------------------------------ laser
  const laser = [];   // { pi, x, y, t }
  let laserRaf = 0;
  function laserPt(pi, x, y) {
    laser.push({ pi, x, y, t: performance.now() });
    live({ k: "laser", pi, x: Math.round(x), y: Math.round(y) });
    if (!laserRaf) laserRaf = requestAnimationFrame(laserLoop);
  }
  function laserLoop() {
    const now = performance.now(), dpr = Math.min(devicePixelRatio || 1, 2);
    const W = laserCv.clientWidth, H = laserCv.clientHeight;
    if (laserCv.width !== Math.round(W * dpr)) { laserCv.width = Math.round(W * dpr); laserCv.height = Math.round(H * dpr); }
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.clearRect(0, 0, W, H);
    while (laser.length && now - laser[0].t > 900) laser.shift();
    const base = laserCv.getBoundingClientRect();
    const rects = new Map();
    const at = p => { if (!rects.has(p.pi)) rects.set(p.pi, pv[p.pi].el.getBoundingClientRect()); const r = rects.get(p.pi), s = r.width / PAGE_W; return [r.left - base.left + p.x * s, r.top - base.top + p.y * s]; };
    lctx.lineCap = lctx.lineJoin = "round";
    for (let i = 1; i < laser.length; i++) {
      const a = laser[i - 1], b = laser[i];
      if (a.pi !== b.pi || b.t - a.t > 80) continue;
      const al = Math.max(0, 1 - (now - b.t) / 900);
      const [x0, y0] = at(a), [x1, y1] = at(b);
      lctx.strokeStyle = set.laser.c; lctx.globalAlpha = al * 0.35; lctx.lineWidth = 14;
      lctx.beginPath(); lctx.moveTo(x0, y0); lctx.lineTo(x1, y1); lctx.stroke();
      lctx.globalAlpha = al; lctx.lineWidth = 5;
      lctx.beginPath(); lctx.moveTo(x0, y0); lctx.lineTo(x1, y1); lctx.stroke();
      lctx.strokeStyle = "#fff"; lctx.globalAlpha = al * 0.9; lctx.lineWidth = 1.6;
      lctx.beginPath(); lctx.moveTo(x0, y0); lctx.lineTo(x1, y1); lctx.stroke();
    }
    lctx.globalAlpha = 1;
    laserRaf = laser.length ? requestAnimationFrame(laserLoop) : 0;
    if (!laser.length) lctx.clearRect(0, 0, W, H);
  }

  // ------------------------------------------------------------------ cử chỉ ngón tay: cuộn + chụm phóng to
  const touches = new Map();
  let g = null, inertia = 0;
  function stopInertia() { cancelAnimationFrame(inertia); inertia = 0; }
  function anchorAt(cx, cy) {
    const h = pageAt(cx, cy) || { i: currentPage(), r: pv[currentPage()].el.getBoundingClientRect() };
    const u = toUnit(h.r, cx, cy);
    return { pi: h.i, x: u.x, y: u.y };
  }
  function setZoom(z, cx, cy, anchor) {
    z = Math.max(MIN_Z, Math.min(MAX_Z, z));
    const an = anchor || anchorAt(cx, cy);
    zoom = z;
    layout();
    const r = pv[an.pi].el.getBoundingClientRect(), s = r.width / PAGE_W;
    wrap.scrollLeft += r.left + an.x * s - cx;
    wrap.scrollTop += r.top + an.y * s - cy;
    zoomBadge.textContent = Math.round(zoom * 100) + "%";
    zoomBadge.classList.add("in");
    clearTimeout(zoomBadge._t);
    zoomBadge._t = setTimeout(() => zoomBadge.classList.remove("in"), 900);
  }
  function gStart() {
    const pts = [...touches.values()];
    stopInertia();
    if (pts.length === 1) g = { mode: "pan", lx: pts[0].x, ly: pts[0].y, vx: 0, vy: 0, lt: performance.now(), sx: pts[0].x, sy: pts[0].y, t0: performance.now(), moved: false };
    else if (pts.length >= 2) {
      const [a, b] = pts, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      g = { mode: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: zoom, anchor: anchorAt(cx, cy) };
    }
  }
  function gMove() {
    const pts = [...touches.values()];
    if (!g) return;
    if (g.mode === "pan" && pts.length === 1) {
      const p = pts[0], now = performance.now(), dt = Math.max(1, now - g.lt);
      const dx = p.x - g.lx, dy = p.y - g.ly;
      wrap.scrollLeft -= dx; wrap.scrollTop -= dy;
      g.vx = 0.8 * (dx / dt) + 0.2 * g.vx; g.vy = 0.8 * (dy / dt) + 0.2 * g.vy;
      g.lx = p.x; g.ly = p.y; g.lt = now;
      if (Math.hypot(p.x - g.sx, p.y - g.sy) > 8) g.moved = true;
    } else if (g.mode === "pinch" && pts.length >= 2) {
      const [a, b] = pts, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      setZoom(g.z0 * (Math.hypot(a.x - b.x, a.y - b.y) / g.d0), cx, cy, g.anchor);
    }
  }
  function gEnd(tap) {
    if (!g) return;
    if (g.mode === "pinch") {
      refreshVisible(); liveView();
      if (touches.size === 1) gStart(); else g = null;
      return;
    }
    if (touches.size) return;
    const was = g; g = null;
    if (!was.moved && performance.now() - was.t0 < 300) return tap && tap(was.sx, was.sy);
    if (performance.now() - was.lt > 80) return;
    let vx = was.vx * 16, vy = was.vy * 16;
    const step = () => {
      vx *= 0.95; vy *= 0.95;
      wrap.scrollLeft -= vx; wrap.scrollTop -= vy;
      inertia = Math.abs(vx) + Math.abs(vy) > 0.4 ? requestAnimationFrame(step) : 0;
    };
    inertia = requestAnimationFrame(step);
  }
  function fingerTap(cx, cy) {
    const h = pageAt(cx, cy);
    if (!h) return;
    const u = toUnit(h.r, cx, cy);
    if (set.tool === "text") openText(h.i, u.x, u.y);
    else if (sel && !pointInSel(h.i, u.x, u.y)) clearSel();
  }
  const pointInSel = (pi, x, y) => sel && sel.pi === pi && x >= sel.box.x && x <= sel.box.x + sel.box.w && y >= sel.box.y && y <= sel.box.y + sel.box.h;

  // ------------------------------------------------------------------ con trỏ
  // ⭐ v0.3.0 (thầy 25/10: "khi đè tay lên viết, nét bút bị dừng và có menu của trình duyệt hiện lên") — chặn MỌI hành vi gốc của
  //   iOS trên vùng viết: menu Sao chép/Dịch thuật khi tì tay, kính lúp, bôi chọn chữ, Scribble của Apple Pencil, chạm đúp phóng.
  //   Chính các hành vi đó bắn pointercancel làm nét đứt. Pointer events vẫn tới đủ — app tự cuộn/phóng.
  const noNative = e => { if (!e.target.closest(".sel-menu, .text-edit, .add-page")) e.preventDefault(); };
  wrap.addEventListener("touchstart", noNative, { passive: false });
  wrap.addEventListener("touchmove", noNative, { passive: false });
  wrap.addEventListener("contextmenu", e => e.preventDefault());
  const noSelect = e => { if (!e.target.closest || !e.target.closest("input, textarea")) e.preventDefault(); };
  document.addEventListener("selectstart", noSelect);

  wrap.addEventListener("pointerdown", e => {
    if (e.target.closest(".sel-menu, .text-edit, .add-page")) return;
    lastInput = performance.now();
    if (e.pointerType === "pen") {
      penSeen = true;
      // bút chạm ⇒ huỷ cử chỉ ngón/lòng bàn tay đang dở (tì tay trước khi đặt bút)
      if (touches.size) { touches.clear(); g = null; stopInertia(); }
      if (document.activeElement && document.activeElement.matches("input, textarea") && !document.activeElement.classList.contains("text-edit")) document.activeElement.blur();
    }
    // lòng bàn tay: vùng chạm to (> 44 px) sau khi đã dùng bút ⇒ bỏ qua hẳn
    if (e.pointerType === "touch" && penSeen && Math.max(e.width || 0, e.height || 0) > 44) return;
    const fingerAsGesture = e.pointerType === "touch" && (!set.finger || penDown || active || touches.size);
    if (e.pointerType === "touch" && (fingerAsGesture || (set.finger && set.tool === "text"))) {
      if (penDown) return;                                  // chống tì tay: bút đang chạm thì bỏ qua ngón
      if (active && active.kind === "stroke" && e.pointerType === "touch" && active.touch && performance.now() - active.t0 < 180) {
        // ngón thứ 2 chạm ngay sau ngón 1 ⇒ đó là cử chỉ 2 ngón, huỷ nét vừa bắt đầu
        liveClear(); lt = null; touches.set(active.pid, active.firstPt); active = null;
      }
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { wrap.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      gStart();
      return;
    }
    if (e.button > 0 || active) return;
    if (e.pointerType === "pen") penDown = true;
    commitText();
    const h = pageAt(e.clientX, e.clientY);
    if (!h) { if (sel) clearSel(); return; }
    e.preventDefault();
    try { wrap.setPointerCapture(e.pointerId); } catch (er) { /* */ }
    stopInertia();
    const u = toUnit(h.r, e.clientX, e.clientY);
    const tool = set.tool;
    const base = { pid: e.pointerId, pi: h.i, r: h.r, t0: performance.now(), touch: e.pointerType === "touch", firstPt: { x: e.clientX, y: e.clientY } };
    if (tool === "lasso" && pointInSel(h.i, u.x, u.y)) {
      active = { ...base, kind: "move", sx: u.x, sy: u.y };
      sel.moving = true; sel.dx = sel.dy = 0;
      placeOverlay(h.i); queueRender(h.i); drawMoving();
      return;
    }
    if (sel) clearSel();
    if (tool === "pen" || tool === "hl") { startStroke(h.i, h.r, e); active.t0 = base.t0; active.touch = base.touch; active.firstPt = base.firstPt; }
    else if (tool === "eraser") { active = { ...base, kind: "erase" }; placeOverlay(h.i); eraseAt(u.x, u.y); drawEraserRing(u.x, u.y); }
    else if (tool === "lasso") { active = { ...base, kind: "lasso", poly: [u.x, u.y] }; placeOverlay(h.i); }
    else if (tool === "text") { active = { ...base, kind: "text", sx: u.x, sy: u.y }; }
    else if (tool === "laser") { active = { ...base, kind: "laser" }; laserPt(h.i, u.x, u.y); }
  });

  wrap.addEventListener("pointermove", e => {
    if (touches.has(e.pointerId)) { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); gMove(); return; }
    const a = active;
    if (!a || a.pid !== e.pointerId) return;
    e.preventDefault();
    lastInput = performance.now();
    if (a.kind === "stroke") return addPts(e);   // khung trang chốt lúc đặt bút (đang viết không cuộn) — khỏi đo lại mỗi lần
    a.r = pv[a.pi].el.getBoundingClientRect();
    const u = toUnit(a.r, e.clientX, e.clientY);
    if (a.kind === "erase") { for (const ev of evPts(e)) { const q = toUnit(a.r, ev.clientX, ev.clientY); eraseAt(q.x, q.y); } drawEraserRing(u.x, u.y); }
    else if (a.kind === "lasso") { a.poly.push(u.x, u.y); drawLassoPath(a.poly); }
    else if (a.kind === "move") { sel.dx = u.x - a.sx; sel.dy = u.y - a.sy; drawMoving(); }
    else if (a.kind === "laser") laserPt(a.pi, u.x, u.y);
  });

  const up = e => {
    if (e.pointerType === "pen") penDown = false;
    if (touches.has(e.pointerId)) { touches.delete(e.pointerId); gEnd(e.type === "pointerup" ? fingerTap : null); return; }
    const a = active;
    if (!a || a.pid !== e.pointerId) return;
    active = null;
    if (a.kind === "stroke") { active = a; endStroke(); active = null; }
    else if (a.kind === "erase") { clearOverlay(); if (a.changed) { livePage(a.pi); dirty(); } }
    else if (a.kind === "lasso") { active = a; finishLasso(a.poly); active = null; }
    else if (a.kind === "move") endMove();
    else if (a.kind === "text" && e.type === "pointerup") openText(a.pi, a.sx, a.sy);
  };
  wrap.addEventListener("pointerup", up);
  wrap.addEventListener("pointercancel", up);

  wrap.addEventListener("wheel", e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(zoom * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    clearTimeout(wrap._zt);
    wrap._zt = setTimeout(() => { refreshVisible(); liveView(); }, 150);
  }, { passive: false });

  let scrollRaf = 0;
  wrap.addEventListener("scroll", () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; if (!g || g.mode !== "pinch") refreshVisible(); updPager(); liveView(); });
  });

  // ------------------------------------------------------------------ trang: thêm / xoá / giấy / chuyển trang
  let curPi = -1;
  function updPager() {
    const c = currentPage();
    pgN.textContent = `${c + 1} / ${doc.pages.length}`;
    if (c !== curPi) { curPi = c; if (sender.on) { live({ k: "doc", title: meta.title, n: doc.pages.length, pi: c }); livePage(c); } }
  }
  function goPage(i) {
    i = Math.max(0, Math.min(doc.pages.length - 1, i));
    wrap.scrollTo({ top: pv[i].el.offsetTop - 70, behavior: "smooth" });
  }
  function addPage(at) {
    snapPages();
    const prev = doc.pages[at - 1];
    const paper = prev && !prev.img ? prev.paper : localStorage.getItem("mynote.paper") || "blank";
    doc.pages.splice(at, 0, newPage(paper));
    buildPages(); refreshVisible(); dirty();
    setTimeout(() => goPage(at), 50);
  }
  async function delPage(i) {
    if (doc.pages.length < 2) return toast("Ghi chú cần ít nhất 1 trang");
    if (!(await askConfirm("Xoá trang?", `Xoá trang ${i + 1} của ghi chú này.`))) return;
    snapPages();
    doc.pages.splice(i, 1);
    buildPages(); refreshVisible(); dirty(); liveAll();
  }
  function setPaper(p) {
    snapPages();
    doc.pages.forEach(pg => { if (!pg.img) pg.paper = p; });
    try { localStorage.setItem("mynote.paper", p); } catch (e) { /* */ }
    pv.forEach((v, i) => queueRender(i));
    dirty(); liveAll();
  }

  // ------------------------------------------------------------------ LIVE
  const sentImg = new Set();
  const sender = createLiveSender({
    onState: () => paintLive(),
    onNeed: () => { sentImg.clear(); liveAll(); },   // máy chiếu vừa nối ⇒ gửi lại trang + ảnh nền
  });
  function live(m) { if (sender.on) sender.send(m); }
  async function livePage(pi) {
    if (!sender.on) return;
    const pg = doc.pages[pi];
    if (pg.img && !sentImg.has(pg.img)) { sentImg.add(pg.img); sender.send({ k: "img", id: pg.img, data: await blobDataUrl(pg.img) }); }
    sender.send({ k: "page", pi, page: { h: pg.h, paper: pg.paper, img: pg.img || "", strokes: pg.strokes } });
  }
  function liveAll() {
    if (!sender.on) return;
    const c = currentPage();
    sender.send({ k: "doc", title: meta.title, n: doc.pages.length, pi: c });
    livePage(c);
    liveView();
  }
  let viewT = 0;
  function liveView() {
    if (!sender.on || viewT) return;
    viewT = setTimeout(() => {
      viewT = 0;
      const c = currentPage(), r = pv[c].el.getBoundingClientRect(), w = wrap.getBoundingClientRect();
      const s = PAGE_W / r.width, pg = doc.pages[c];
      const cl = (v, m) => Math.max(0, Math.min(m, v));
      sender.send({ k: "view", pi: c, x0: cl((w.left - r.left) * s, PAGE_W), y0: cl((w.top - r.top) * s, pg.h), x1: cl((w.right - r.left) * s, PAGE_W), y1: cl((w.bottom - r.top) * s, pg.h) });
    }, 120);
  }
  function paintLive() {
    const st = sender.state;
    liveBtn.classList.toggle("on", sender.on);
    liveBtn.classList.toggle("ok", st === "on" || st === "relay");
    liveBtn.querySelector("span").textContent = LIVE_TEXT[st] || "LIVE";
  }
  async function toggleLive(auto) {
    if (sender.on) { sender.stop(); toast("Đã tắt LIVE"); return; }
    if (auto && !LIVE_LOCAL && !(await currentUser())) return;   // tự bật lúc mở ghi chú: chưa đăng nhập thì thôi, không bật popup
    if (!LIVE_LOCAL && !getUser()) {
      try { await signIn(); } catch (e) { if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") toast(e.message || "Đăng nhập không được"); return; }
    }
    sentImg.clear(); sender.start(); liveAll();
    if (!auto) toast("LIVE: bấm nút NOTE trên AWord để chiếu");
  }

  // ------------------------------------------------------------------ nút
  $('[data-act="back"]').onclick = () => { location.hash = ""; };
  $('[data-act="undo"]').onclick = doUndo;
  $('[data-act="redo"]').onclick = doRedo;
  liveBtn.onclick = () => toggleLive(false);
  $('[data-act="pgUp"]').onclick = () => goPage(currentPage() - 1);
  $('[data-act="pgDown"]').onclick = () => goPage(currentPage() + 1);
  $('[data-act="more"]').onclick = e => {
    const r = e.currentTarget.getBoundingClientRect(), c = currentPage();
    popMenu(r.right - 230, r.bottom + 8, [
      { icon: "filePlus", label: "Thêm trang sau trang này", onClick: () => addPage(c + 1) },
      { icon: "grid", label: "Kiểu giấy", sub: [["blank", "Giấy trắng"], ["lined", "Kẻ dòng"], ["grid", "Ô vuông"], ["dots", "Chấm"]].map(([p, l]) => ({ label: l, on: doc.pages[c].paper === p, onClick: () => setPaper(p) })) },
      { icon: "fit", label: "Vừa khung (100%)", onClick: () => { const rr = wrap.getBoundingClientRect(); setZoom(1, rr.left + rr.width / 2, rr.top + rr.height / 2); refreshVisible(); } },
      { icon: "download", label: "Lưu trang này thành ảnh", onClick: () => exportPage(c) },
      "-",
      { icon: "trash", label: "Xoá trang này", danger: true, onClick: () => delPage(c) },
    ]);
  };
  $(".ed-title").onchange = () => { dirty(); if (sender.on) live({ k: "doc", title: $(".ed-title").value, n: doc.pages.length, pi: currentPage() }); };
  $(".ed-title").onkeydown = e => { if (e.key === "Enter") e.target.blur(); };

  async function exportPage(i) {
    const pg = doc.pages[i], k = 2;
    const c = document.createElement("canvas");
    c.width = PAGE_W * k; c.height = Math.round(pg.h * k);
    renderPage(c.getContext("2d"), pg, k, await getImg(pg.img));
    const a = document.createElement("a");
    a.download = `${meta.title} - trang ${i + 1}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }

  const onKey = e => {
    if (e.target.matches("input, textarea")) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); }
    else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); doRedo(); }
    else if ((e.key === "Delete" || e.key === "Backspace") && sel) sel.el.querySelector('[data-s="del"]').click();
    else if (!mod && "123456".includes(e.key)) { set.tool = TOOLS[+e.key - 1][0]; saveSet(); clearSel(); paintPalette(); }
  };
  document.addEventListener("keydown", onKey);
  const onResize = () => { layout(); refreshVisible(); };
  window.addEventListener("resize", onResize);
  const onHide = () => { if (document.visibilityState === "hidden" && (saveT || thumbDirty)) save(true); };
  document.addEventListener("visibilitychange", onHide);
  const onLeave = () => sender.stop();   // đóng/tải lại trang khi đang LIVE ⇒ báo máy chiếu thôi chờ (khỏi kẹt "Connecting…")
  window.addEventListener("pagehide", onLeave);

  paintPalette();
  buildPages();
  refreshVisible();
  updPager();
  updUR();
  try { if (localStorage.getItem("mynote.autolive") === "1") toggleLive(true); } catch (e) { /* */ }   // Cài đặt ▸ Tự bật LIVE

  // dọn khi rời màn (main.js gọi)
  return async () => {
    commitText();
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onLeave);
    sender.stop();
    document.removeEventListener("selectstart", noSelect);
    if (saveT || thumbDirty || $(".ed-title").value !== meta.title) await save(true);
    else if (saving) await saving;
    pv.forEach(v => { if (v.cv) v.cv.width = v.cv.height = 0; });
  };
}
