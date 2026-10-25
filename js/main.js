// main.js — điều hướng: #/note/<id> = màn viết, còn lại = thư viện. Lần đầu mở tạo sẵn 1 ghi chú hướng dẫn.
import { db, uid } from "./db.js";
import { showLibrary, createNote } from "./library.js";
import { openEditor } from "./editor.js";
import { A4_H } from "./ink.js";

const root = document.getElementById("app");
let cleanup = null, busy = Promise.resolve();

function route() {
  busy = busy.then(async () => {
    if (cleanup) { try { await cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const m = location.hash.match(/^#\/note\/(.+)$/);
    document.body.classList.toggle("in-editor", !!m);
    cleanup = m ? await openEditor(root, decodeURIComponent(m[1])) : await showLibrary(root);
  });
}

// ---- chặn phóng to cả trang trên iPad (app tự lo chụm phóng to trong màn viết)
document.addEventListener("gesturestart", e => e.preventDefault());
document.addEventListener("dblclick", e => { if (!e.target.closest("input, textarea")) e.preventDefault(); });

// ---- ghi chú hướng dẫn lần đầu
async function seed() {
  try { if (localStorage.getItem("mynote.seeded")) return; } catch (e) { return; }
  const have = await db.all("notes");
  try { localStorage.setItem("mynote.seeded", "1"); } catch (e) { /* */ }
  if (have.length) return;
  const T = (x, y, s, c, text) => ({ id: uid(), t: "text", x, y, s, c, text });
  const wave = [];
  for (let i = 0; i <= 80; i++) { const t = i / 80; wave.push(Math.round((560 + 340 * t) * 10) / 10, Math.round((180 + 26 * Math.sin(t * Math.PI * 3)) * 10) / 10, 0.35 + 0.6 * Math.sin(t * Math.PI)); }
  const ring = [];
  for (let i = 0; i <= 60; i++) { const a = (i / 60) * Math.PI * 2.08 - 1.2; ring.push(Math.round((300 + 150 * Math.cos(a)) * 10) / 10, Math.round((560 + 40 * Math.sin(a)) * 10) / 10, 0.6); }
  const hl = [70, 335, 0.5, 520, 335, 0.5];
  await createNote({
    title: "Chào mừng đến myNote",
    pages: [{
      h: A4_H, paper: "lined",
      strokes: [
        { id: uid(), t: "hl", c: "#fde047", w: 26, pr: false, p: hl },
        T(70, 120, 46, "#1f2937", "myNote"),
        T(70, 190, 26, "#475569", "Ghi chú viết tay cho lớp học"),
        { id: uid(), t: "pen", c: "#2563eb", w: 3.2, pr: true, p: wave },
        T(70, 318, 26, "#1f2937", "Thử ngay trên trang này:"),
        T(90, 380, 23, "#1f2937", "• Bút (phím 1) — Apple Pencil có lực nhấn\n• Dạ quang (2) · Tẩy (3) — bấm lại để đổi kiểu tẩy\n• Lasso (4): khoanh vùng → kéo, xoá, tô màu\n• Gõ chữ (5) · Bút laser (6)\n• Ngón tay: cuộn + chụm 2 ngón để phóng to"),
        { id: uid(), t: "pen", c: "#e11d48", w: 3.2, pr: false, p: ring },
        T(70, 700, 26, "#1f2937", "Bấm LIVE (góc phải trên) rồi mở nút NOTE"),
        T(70, 740, 26, "#1f2937", "trên AWord ⇒ nét viết hiện thẳng lên máy chiếu."),
      ],
    }],
  });
}

if ("serviceWorker" in navigator && window.isSecureContext && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(e => console.warn("sw", e));
}

window.addEventListener("hashchange", route);
seed().catch(console.error).finally(route);
