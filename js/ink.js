// ink.js — VẼ nét/giấy dùng chung cho myNote (iPad) và màn NOTE phía AWord (máy chiếu).
// Toạ độ trang: rộng luôn 1000 đơn vị, cao = page.h (A4 dọc = 1414). k = số px mỗi đơn vị.
// Nét: { id, t:"pen"|"hl"|"text", c, w, pr (có lực nhấn), p:[x,y,lực, x,y,lực, ...] }
//      chữ: { id, t:"text", x, y, s (cỡ), c, text }
export const PAGE_W = 1000;
export const A4_H = 1414;

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';

// Độ dày theo lực nhấn: bút có lực ⇒ 55 %–125 % độ dày gốc (v0.3.1: hẹp lại — Pencil dao động lực liên tục ⇒ mép "run");
// chuột/ngón ⇒ đều nét; dạ quang LUÔN đều nét (như bút dạ thật)
const pw = (s, pr) => (s.pr && s.t !== "hl" ? 0.55 + 0.7 * pr : 1);

// Canvas nháp dùng chung để vẽ dạ quang (xem drawStroke)
let scratch = null;

export function drawPaper(ctx, page, k, img) {
  const W = PAGE_W * k, H = page.h * k;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  if (img) { ctx.drawImage(img, 0, 0, W, H); return; }
  const paper = page.paper || "blank";
  if (paper === "blank") return;
  ctx.save();
  if (paper === "lined") {
    ctx.strokeStyle = "#c9dcf2"; ctx.lineWidth = Math.max(1, 1.2 * k);
    ctx.beginPath();
    for (let y = 130; y < page.h - 40; y += 36) { ctx.moveTo(0, y * k); ctx.lineTo(W, y * k); }
    ctx.stroke();
    ctx.strokeStyle = "#f3b7c2"; ctx.beginPath(); ctx.moveTo(100 * k, 0); ctx.lineTo(100 * k, H); ctx.stroke();
  } else if (paper === "grid") {
    ctx.strokeStyle = "#e3e8ef"; ctx.lineWidth = Math.max(1, 1 * k);
    ctx.beginPath();
    for (let x = 25; x < PAGE_W; x += 25) { ctx.moveTo(x * k, 0); ctx.lineTo(x * k, H); }
    for (let y = 25; y < page.h; y += 25) { ctx.moveTo(0, y * k); ctx.lineTo(W, y * k); }
    ctx.stroke();
  } else if (paper === "dots") {
    ctx.fillStyle = "#c3cad5";
    const r = Math.max(1, 1.6 * k);
    for (let x = 25; x < PAGE_W; x += 25) for (let y = 25; y < page.h; y += 25) { ctx.beginPath(); ctx.arc(x * k, y * k, r, 0, 6.2832); ctx.fill(); }
  }
  ctx.restore();
}

export function drawStroke(ctx, s, k, dx = 0, dy = 0) {
  if (s.t === "text") return drawText(ctx, s, k, dx, dy);
  const p = s.p, n = p.length / 3;
  if (!n) return;
  ctx.save();
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = s.c; ctx.fillStyle = s.c;
  const X = i => (p[i * 3] + dx) * k, Y = i => (p[i * 3 + 1] + dy) * k;
  if (s.t === "hl") {
    // ⭐ v0.3.1 (thầy 25/10: "nét bút dạ quang bị đứt đoạn lung tung") — Safari tô nét DÀY + TRONG SUỐT qua nhiều đoạn cong ngắn bị
    //   khuyết hình lưỡi liềm. Nay: vẽ hình nét ĐẶC 100 % lên canvas nháp (chỗ chồng nhau không đậm thêm, không hở), rồi dán MỘT lần
    //   vào trang với độ trong 36 % + multiply. Canvas nháp theo đúng độ phân giải thật của ctx (đọc từ ma trận hiện tại).
    const T = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 };
    const sc = Math.hypot(T.a, T.b) || 1;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < n; i++) { const x = X(i), y = Y(i); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const m = (s.w * k) / 2 + 2;
    x0 -= m; y0 -= m; x1 += m; y1 += m;
    const W = Math.max(1, Math.ceil((x1 - x0) * sc)), H = Math.max(1, Math.ceil((y1 - y0) * sc));
    if (!scratch) scratch = document.createElement("canvas");
    if (scratch.width < W || scratch.height < H) { scratch.width = Math.max(scratch.width, W); scratch.height = Math.max(scratch.height, H); }
    const g = scratch.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    g.setTransform(sc, 0, 0, sc, -x0 * sc, -y0 * sc);
    fillPen(g, s, k, dx, dy);
    ctx.globalAlpha = 0.36;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(scratch, 0, 0, W, H, x0, y0, W / sc, H / sc);
    ctx.restore();
    return;
  }
  if (n === 1) {
    ctx.beginPath(); ctx.arc(X(0), Y(0), (s.w * k * pw(s, p[2])) / 2, 0, 6.2832); ctx.fill();
    ctx.restore();
    return;
  }
  fillPen(ctx, s, k, dx, dy);
  ctx.restore();
}

// ⭐ NÉT BÚT = MỘT HÌNH TÔ (v0.3.0, thầy 25/10: "nét bút không mượt, bị giật … cần mượt, đẹp như Notability").
// Cũ: mỗi đoạn nhỏ một lệnh stroke() riêng, đầu tròn chồng nhau ⇒ mép gợn hạt, nặng (n lệnh vẽ/nét).
// Nay: dựng ĐƯỜNG VIỀN của cả nét — mỗi điểm lệch sang 2 bên theo pháp tuyến, bán kính theo lực nhấn — rồi nối mềm bằng
// quadraticCurveTo qua trung điểm và tô MỘT lần (luật nonzero ⇒ nét tự cắt / vòng chữ o vẫn đặc). Hai đầu + góc gắt (> ~100°)
// thêm chấm tròn để đầu nét tròn và góc không bị khuyết.
export function fillPen(ctx, s, k, dx = 0, dy = 0) {
  const p = s.p, n = p.length / 3;
  if (!n) return;
  // v0.3.1 — làm mượt lúc VẼ: mỗi điểm = (trước + 2×nó + sau) / 4 (giữ nguyên 2 đầu); lực nhấn trung bình 5 điểm ⇒ hết mép "run"
  const xs = new Float64Array(n), ys = new Float64Array(n), ps = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = i ? i - 1 : 0, b = i < n - 1 ? i + 1 : n - 1;
    xs[i] = i === 0 || i === n - 1 ? p[i * 3] : (p[a * 3] + 2 * p[i * 3] + p[b * 3]) / 4;
    ys[i] = i === 0 || i === n - 1 ? p[i * 3 + 1] : (p[a * 3 + 1] + 2 * p[i * 3 + 1] + p[b * 3 + 1]) / 4;
    let sum = 0, c = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) { sum += p[j * 3 + 2]; c++; }
    ps[i] = sum / c;
  }
  const X = new Float64Array(n), Y = new Float64Array(n), R = new Float64Array(n);
  for (let i = 0; i < n; i++) { X[i] = (xs[i] + dx) * k; Y[i] = (ys[i] + dy) * k; R[i] = Math.max(0.35, (s.w * k * pw(s, ps[i])) / 2); }
  ctx.fillStyle = s.c;
  fillVar(ctx, X, Y, R, n);
}

// Tô một nét có bán kính thay đổi: viền 2 bên theo pháp tuyến, nối mềm qua trung điểm, tô MỘT lần (nonzero) + chấm tròn ở 2 đầu
// và góc gắt. Dùng chung cho bút (fillPen) và bút laser (drawLaser). X/Y/R tính sẵn theo px của ctx.
export function fillVar(ctx, X, Y, R, n) {
  if (!n) return;
  if (n === 1) { ctx.beginPath(); ctx.arc(X[0], Y[0], R[0], 0, 6.2832); ctx.fill(); return; }
  const L = new Float64Array(n * 2), Q = new Float64Array(n * 2), sharp = [];
  for (let i = 0; i < n; i++) {
    const a = i ? i - 1 : 0, b = i < n - 1 ? i + 1 : n - 1;
    let vx = X[b] - X[a], vy = Y[b] - Y[a];
    const len = Math.hypot(vx, vy) || 1;
    vx /= len; vy /= len;
    const r = R[i], x = X[i], y = Y[i];
    L[i * 2] = x - vy * r; L[i * 2 + 1] = y + vx * r;
    Q[i * 2] = x + vy * r; Q[i * 2 + 1] = y - vx * r;
    if (i > 0 && i < n - 1) {
      const ax = x - X[i - 1], ay = y - Y[i - 1], bx = X[i + 1] - x, by = Y[i + 1] - y;
      const d = Math.hypot(ax, ay) * Math.hypot(bx, by);
      if (d && (ax * bx + ay * by) / d < -0.17) sharp.push(i);
    }
  }
  ctx.beginPath();
  ctx.moveTo(L[0], L[1]);
  for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(L[i * 2], L[i * 2 + 1], (L[i * 2] + L[i * 2 + 2]) / 2, (L[i * 2 + 1] + L[i * 2 + 3]) / 2);
  ctx.lineTo(L[(n - 1) * 2], L[(n - 1) * 2 + 1]);
  ctx.lineTo(Q[(n - 1) * 2], Q[(n - 1) * 2 + 1]);
  for (let i = n - 2; i > 0; i--) ctx.quadraticCurveTo(Q[i * 2], Q[i * 2 + 1], (Q[i * 2] + Q[i * 2 - 2]) / 2, (Q[i * 2 + 1] + Q[i * 2 - 1]) / 2);
  ctx.lineTo(Q[0], Q[1]);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  for (const i of [0, n - 1, ...sharp]) { ctx.moveTo(X[i] + R[i], Y[i]); ctx.arc(X[i], Y[i], R[i], 0, 6.2832); }
  ctx.fill();
}

// ⭐ BÚT LASER (v0.3.2, thầy 25/10: "nét bút tương tự như nét bút viết thông thường, chỉ khác là có ánh sáng mềm tỏa ra như laser").
// pts = [{x, y, t, g}] theo đơn vị trang (g = mã nét: nhấc bút là nét mới), now = performance.now() của máy đang vẽ.
// Nét = viền tô mượt như bút (fillVar), đầu đuôi nhỏ dần theo tuổi (LASER_LIFE ms) rồi biến mất; quầng sáng = 2 lớp bóng mờ cùng màu.
// k = px mỗi đơn vị trong hệ toạ độ ctx; glow = độ toả (px THIẾT BỊ — shadowBlur không theo ma trận biến đổi).
export const LASER_LIFE = 1100;
export function drawLaser(ctx, pts, now, k, color, glow, width = 3.2) {
  let i = 0;
  while (i < pts.length) {
    let j = i;
    while (j + 1 < pts.length && pts[j + 1].g === pts[i].g) j++;
    const n = j - i + 1;
    const X = new Float64Array(n), Y = new Float64Array(n), R = new Float64Array(n);
    let m = 0;
    for (let q = i; q <= j; q++) {
      const age = now - pts[q].t;
      if (age > LASER_LIFE) continue;
      const f = 1 - age / LASER_LIFE;
      // làm mượt 1-2-1 như bút
      const a = q > i ? q - 1 : q, b = q < j ? q + 1 : q;
      X[m] = ((pts[a].x + 2 * pts[q].x + pts[b].x) / 4) * k;
      Y[m] = ((pts[a].y + 2 * pts[q].y + pts[b].y) / 4) * k;
      R[m] = Math.max(0.2, (width * k / 2) * Math.min(1, f / 0.55));
      m++;
    }
    if (m) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow * 2.2; ctx.globalAlpha = 0.6;
      fillVar(ctx, X, Y, R, m);
      ctx.shadowBlur = glow * 0.8; ctx.globalAlpha = 1;
      fillVar(ctx, X, Y, R, m);
      ctx.restore();
    }
    i = j + 1;
  }
}

// ---------- chữ gõ ----------
export function textLines(ctx, s) {
  ctx.font = `${s.s}px ${FONT}`;
  const maxW = Math.max(120, PAGE_W - s.x - 40);
  const out = [];
  for (const para of String(s.text || "").split("\n")) {
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      const test = line + word;
      if (line && ctx.measureText(test).width > maxW && word.trim()) { out.push(line.trimEnd()); line = word.trimStart(); }
      else line = test;
    }
    out.push(line);
  }
  return out;
}

export function textBox(ctx, s) {
  ctx.save();
  const lines = textLines(ctx, s);
  let w = 0;
  for (const l of lines) w = Math.max(w, ctx.measureText(l).width);
  ctx.restore();
  return { x: s.x, y: s.y, w: Math.max(w, 20), h: lines.length * s.s * 1.3 };
}

function drawText(ctx, s, k, dx, dy) {
  ctx.save();
  const lines = textLines(ctx, s);
  ctx.font = `${s.s * k}px ${FONT}`;
  ctx.fillStyle = s.c;
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, (s.x + dx) * k, (s.y + dy + i * s.s * 1.3 + s.s * 0.12) * k));
  ctx.restore();
}

export function strokeBox(ctx, s) {
  if (s.t === "text") return textBox(ctx, s);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < s.p.length; i += 3) {
    x0 = Math.min(x0, s.p[i]); x1 = Math.max(x1, s.p[i]);
    y0 = Math.min(y0, s.p[i + 1]); y1 = Math.max(y1, s.p[i + 1]);
  }
  const r = s.w / 2;
  return { x: x0 - r, y: y0 - r, w: x1 - x0 + 2 * r, h: y1 - y0 + 2 * r };
}

export function renderPage(ctx, page, k, img, skip) {
  drawPaper(ctx, page, k, img);
  for (const s of page.strokes) if (!skip || !skip.has(s.id)) drawStroke(ctx, s, k);
}
