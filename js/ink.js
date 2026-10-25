// ink.js — VẼ nét/giấy dùng chung cho myNote (iPad) và màn NOTE phía AWord (máy chiếu).
// Toạ độ trang: rộng luôn 1000 đơn vị, cao = page.h (A4 dọc = 1414). k = số px mỗi đơn vị.
// Nét: { id, t:"pen"|"hl"|"text", c, w, pr (có lực nhấn), p:[x,y,lực, x,y,lực, ...] }
//      chữ: { id, t:"text", x, y, s (cỡ), c, text }
export const PAGE_W = 1000;
export const A4_H = 1414;

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';

// Độ dày theo lực nhấn: bút có lực ⇒ 45 %–130 % độ dày gốc; chuột/ngón ⇒ đều nét
const pw = (s, pr) => (s.pr ? 0.45 + 0.85 * pr : 1);

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
    ctx.globalAlpha = 0.36;
    ctx.globalCompositeOperation = "multiply";
    ctx.lineWidth = s.w * k;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    if (n === 1) ctx.lineTo(X(0) + 0.1, Y(0));
    for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(X(i), Y(i), (X(i) + X(i + 1)) / 2, (Y(i) + Y(i + 1)) / 2);
    if (n > 1) ctx.lineTo(X(n - 1), Y(n - 1));
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (n === 1) {
    ctx.beginPath(); ctx.arc(X(0), Y(0), (s.w * k * pw(s, p[2])) / 2, 0, 6.2832); ctx.fill();
    ctx.restore();
    return;
  }
  penSegments(ctx, s, k, dx, dy, 1, n);
  ctx.restore();
}

// Vẽ các đoạn [from, to) của nét bút — dùng cả khi vẽ dần lúc đang viết (chỉ vẽ phần mới)
export function penSegments(ctx, s, k, dx, dy, from, to) {
  const p = s.p, n = p.length / 3;
  const X = i => (p[i * 3] + dx) * k, Y = i => (p[i * 3 + 1] + dy) * k;
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = s.c;
  for (let i = Math.max(1, from); i < Math.min(to, n); i++) {
    // đoạn i: từ trung điểm (i-1,i) tới trung điểm (i,i+1), điều khiển tại điểm i; đoạn đầu/cuối chạm đúng mút
    const x0 = i === 1 ? X(0) : (X(i - 1) + X(i)) / 2, y0 = i === 1 ? Y(0) : (Y(i - 1) + Y(i)) / 2;
    const last = i === n - 1;
    const x1 = last ? X(i) : (X(i) + X(i + 1)) / 2, y1 = last ? Y(i) : (Y(i) + Y(i + 1)) / 2;
    const pr = (p[(i - 1) * 3 + 2] + p[i * 3 + 2]) / 2;
    ctx.lineWidth = Math.max(0.6, s.w * k * pw(s, pr));
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    if (last) ctx.lineTo(x1, y1);
    else ctx.quadraticCurveTo(X(i), Y(i), x1, y1);
    ctx.stroke();
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
