// live.js — KÊNH LIVE myNote (iPad) ⇄ nút NOTE của AWord (máy chiếu).
//
// ⭐ BẢN MẪU: đi BroadcastChannel ⇒ chỉ nối được giữa 2 tab CÙNG trình duyệt, cùng máy (để thầy thử giao diện).
// ⭐ BẢN THẬT (sau khi duyệt mẫu): giữ nguyên API send()/onMessage dưới đây, chỉ thay "ống":
//     WebRTC DataChannel nối thẳng iPad → máy chiếu (cùng Wi-Fi), bắt tay qua Firestore users/{uid}/items
//     — y hệt AWord rr-padlink.js: mỗi tài liệu MỘT người ghi ("host" máy chiếu / "pad" iPad), sid + nonce, nudge;
//     Wi-Fi chặn nối thẳng ⇒ dự phòng qua Firestore (chậm hơn nhưng vẫn thấy nét).
//
// Tin iPad → máy chiếu:
//   {k:"doc", title, n, pi}                 — đang mở ghi chú nào, bao nhiêu trang, trang đang xem
//   {k:"page", pi, page:{h,paper,img,strokes}} — gửi NGUYÊN trang (lúc bật LIVE, đổi trang, xoá/hoàn tác/di chuyển)
//   {k:"img", id, data}                     — ảnh nền trang (PDF/ảnh chụp), gửi 1 lần mỗi ảnh
//   {k:"s0", pi, s:{id,t,c,w,pr}}           — bắt đầu nét;  {k:"s+", id, p:[...]} — thêm điểm;  {k:"s1", id} — xong nét
//   {k:"laser", pi, x, y}                   — một điểm bút laser (máy chiếu tự cho mờ dần)
//   {k:"view", pi, x0, y0, x1, y1}          — khung iPad đang nhìn (đơn vị trang) ⇒ chế độ "Theo iPad"
//   {k:"beat"} / {k:"bye"}
// Tin máy chiếu → iPad:  {k:"viewer"} (có màn đang xem) · {k:"need"} (xin gửi lại toàn bộ)
const CH = "mynote-live";

export function createLiveSender({ onViewer, onNeed }) {
  let ch = null, beat = 0, lastViewer = 0, alive = false, watch = 0;
  const set = v => { if (v !== alive) { alive = v; onViewer && onViewer(v); } };
  return {
    start() {
      if (ch) return;
      ch = new BroadcastChannel(CH);
      ch.onmessage = e => {
        const m = e.data || {};
        if (m.k === "viewer") { lastViewer = performance.now(); set(true); }
        if (m.k === "need") { lastViewer = performance.now(); set(true); onNeed && onNeed(); }
      };
      ch.postMessage({ k: "beat" });
      beat = setInterval(() => ch && ch.postMessage({ k: "beat" }), 1500);
      watch = setInterval(() => set(performance.now() - lastViewer < 4000), 1000);
    },
    stop() {
      if (!ch) return;
      try { ch.postMessage({ k: "bye" }); } catch (e) { /* */ }
      clearInterval(beat); clearInterval(watch);
      ch.close(); ch = null; set(false);
    },
    get on() { return !!ch; },
    send(m) { if (ch) ch.postMessage(m); },
  };
}

export function createLiveViewer({ onMessage, onPad }) {
  const ch = new BroadcastChannel(CH);
  let last = 0, alive = false;
  const set = v => { if (v !== alive) { alive = v; onPad && onPad(v); } };
  ch.onmessage = e => {
    const m = e.data || {};
    if (m.k === "bye") { set(false); return; }
    last = performance.now();
    if (!alive) { set(true); ch.postMessage({ k: "need" }); }
    if (m.k === "beat") { ch.postMessage({ k: "viewer" }); return; }
    onMessage(m);
  };
  ch.postMessage({ k: "need" });
  const t = setInterval(() => set(performance.now() - last < 4500), 1000);
  return { close() { clearInterval(t); ch.close(); }, need() { ch.postMessage({ k: "need" }); } };
}
