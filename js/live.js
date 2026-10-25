// live.js — nút LIVE của myNote: gửi nét lên nút NOTE của AWord (máy chiếu).
// Ống thật = note-link.js (WebRTC nối thẳng cùng Wi-Fi, bắt tay qua Firestore tài khoản thầy, dự phòng đi kho).
// Bàn thử: `?padsig=local` ⇒ 2 tab cùng trình duyệt (index.html + AWord có ?padsig=local), không đăng nhập.
//
// Tin iPad → máy chiếu (đơn vị trang, rộng 1000):
//   {k:"doc", title, n, pi} · {k:"page", pi, page:{h,paper,img,strokes}} · {k:"img", id, data}
//   {k:"s0", pi, s:{id,t,c,w,pr}} · {k:"s+", id, p:[...]} · {k:"s1", id, s} · {k:"laser", pi, x, y} · {k:"view", pi, x0, y0, x1, y1}
// Máy chiếu → iPad: {k:"need"} (xin gửi lại toàn bộ — lúc vừa nối)
import { createNotePad, localSignal } from "./note-link.js";
import { firestoreSignal } from "./firebase.js";

export const LIVE_LOCAL = new URLSearchParams(location.search).get("padsig") === "local";

export const LIVE_TEXT = {
  off: "LIVE",
  wait: "LIVE · chờ màn NOTE",
  connecting: "LIVE · đang nối…",
  on: "LIVE · AWord đang xem",
  relay: "LIVE · đường chậm",
};

export function createLiveSender({ onState, onNeed }) {
  return createNotePad({
    signal: LIVE_LOCAL ? localSignal("note") : firestoreSignal(),
    onState,
    onMessage: m => { if (m.k === "need") onNeed && onNeed(); },
  });
}
