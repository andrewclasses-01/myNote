// settings.js — HỘP CÀI ĐẶT (nút bánh răng ở chân cột thư mục, thầy 25/10/2026).
// Ghi thẳng vào đúng khoá máy mà màn viết đọc: mynote.paper · mynote.tools (finger, eraser.mode) · mynote.autolive.
import { db } from "./db.js";
import { icon } from "./icons.js";
import { toast, askConfirm, esc } from "./ui.js";
import { getUser, signIn, signOut } from "./firebase.js";

export const VERSION = "0.3.1";
const TOOLS_KEY = "mynote.tools";

const getJ = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
const setJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } };
const getS = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
const setS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* */ } };

export function openSettings(onChange) {
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal set">
    <div class="set-h"><h3>Cài đặt</h3><button class="icon-btn" data-x title="Đóng">${icon("x")}</button></div>
    <div class="set-b"></div></div>`;
  document.body.append(back);
  requestAnimationFrame(() => back.classList.add("in"));
  const body = back.querySelector(".set-b");
  const close = () => { back.remove(); onChange && onChange(); };
  back.querySelector("[data-x]").onclick = close;
  back.addEventListener("pointerdown", e => { if (e.target === back) close(); });

  const seg = (opts, cur) => `<div class="seg2">${opts.map(([v, l]) => `<button data-v="${v}" class="${v === cur ? "on" : ""}">${l}</button>`).join("")}</div>`;

  function paint() {
    const t = getJ(TOOLS_KEY);
    const finger = !!t.finger, emode = (t.eraser && t.eraser.mode) || "stroke", dtap = t.dtap || "eraser";
    body.innerHTML = `
      <div class="set-g">Viết</div>
      <div class="set-row" data-k="paper"><div><b>Giấy mặc định</b><small>Cho ghi chú mới và trang mới</small></div>
        ${seg([["blank", "Trắng"], ["lined", "Kẻ dòng"], ["grid", "Ô vuông"], ["dots", "Chấm"]], getS("mynote.paper", "blank"))}</div>
      <div class="set-row"><div><b>Ngón tay vẽ</b><small>Tắt: ngón tay chỉ cuộn, chỉ Apple Pencil viết</small></div>
        <button class="sw-t ${finger ? "on" : ""}" data-t="finger"></button></div>
      <div class="set-row" data-k="eraser"><div><b>Kiểu tẩy</b><small>Chữ gõ không bị tẩy</small></div>
        ${seg([["stroke", "Cả nét"], ["part", "Từng phần"]], emode)}</div>

      <div class="set-row" data-k="dtap"><div><b>Chạm đúp bằng ngón tay</b><small>Đổi công cụ nhanh. Chạm 2 ngón = hoàn tác · 3 ngón = làm lại.<br>Chạm đúp Apple Pencil: Safari chưa cho web dùng (chỉ app App Store).</small></div>
        ${seg([["eraser", "Bút ⇄ Tẩy"], ["prev", "Công cụ trước"], ["off", "Tắt"]], dtap)}</div>

      <div class="set-g">LIVE lên AWord</div>
      <div class="set-row"><div><b>Tự bật LIVE khi mở ghi chú</b><small>Mở ghi chú là phát ngay lên nút NOTE của AWord</small></div>
        <button class="sw-t ${getS("mynote.autolive", "0") === "1" ? "on" : ""}" data-t="autolive"></button></div>

      <div class="set-g">Tài khoản & đồng bộ</div>
      <div class="set-row"><div><b>Tài khoản Google (như AWord)</b><small>${getUser() ? esc(getUser().email) + " · LIVE dùng được" : "Đăng nhập để LIVE lên nút NOTE của AWord"}</small></div>
        <button class="btn ${getUser() ? "ghost" : "primary"}" data-b="acct">${getUser() ? "Đăng xuất" : "Đăng nhập"}</button></div>
      <div class="set-row"><div><b>Đồng bộ ghi chú giữa các máy</b><small>Chưa có — ghi chú hiện chỉ nằm trong máy này (dùng Sao lưu để chép)</small></div>
        <button class="btn ghost" disabled style="opacity:.5">Sắp có</button></div>

      <div class="set-g">Dữ liệu</div>
      <div class="set-row"><div><b>Sao lưu</b><small class="usage">Đang tính dung lượng…</small></div>
        <div style="display:flex;gap:6px"><button class="btn ghost" data-b="export">${icon("download")}Xuất</button><button class="btn ghost" data-b="import">Khôi phục</button></div></div>
      <input type="file" accept=".json,application/json" class="hidden" data-f>
      <div class="set-g">Giới thiệu</div>
      <div class="set-row"><div><b>myNote ${VERSION}</b><small>ANDREW CLASSES · note.andrewclasses.com</small></div></div>`;

    body.querySelectorAll(".set-row[data-k] .seg2 button").forEach(b => (b.onclick = () => {
      const k = b.closest(".set-row").dataset.k, v = b.dataset.v;
      if (k === "paper") setS("mynote.paper", v);
      if (k === "eraser") { const t2 = getJ(TOOLS_KEY); t2.eraser = { ...(t2.eraser || {}), mode: v }; setJ(TOOLS_KEY, t2); }
      if (k === "dtap") { const t2 = getJ(TOOLS_KEY); t2.dtap = v; setJ(TOOLS_KEY, t2); }
      paint();
    }));
    body.querySelectorAll("[data-t]").forEach(b => (b.onclick = () => {
      if (b.dataset.t === "finger") { const t2 = getJ(TOOLS_KEY); t2.finger = !t2.finger; setJ(TOOLS_KEY, t2); }
      if (b.dataset.t === "autolive") setS("mynote.autolive", getS("mynote.autolive", "0") === "1" ? "0" : "1");
      paint();
    }));
    body.querySelector('[data-b="acct"]').onclick = async () => {
      try { if (getUser()) await signOut(); else await signIn(); } catch (e) { if (!/popup-closed|cancelled-popup/.test(e.code || "")) toast(e.message || "Không được"); }
      setTimeout(paint, 300);
    };
    body.querySelector('[data-b="export"]').onclick = exportAll;
    const fi = body.querySelector("[data-f]");
    body.querySelector('[data-b="import"]').onclick = () => fi.click();
    fi.onchange = () => { const f = fi.files[0]; fi.value = ""; if (f) importAll(f); };
    usage(body.querySelector(".usage"));
  }
  paint();
}

async function usage(el) {
  const n = (await db.all("notes")).length;
  let mb = "";
  try { const e = await navigator.storage.estimate(); mb = ` · ${(e.usage / 1048576).toFixed(1)} MB`; } catch (e) { /* */ }
  if (el.isConnected) el.textContent = `${n} ghi chú${mb} — xuất ra 1 file .json để chép sang máy khác`;
}

const blobUrl = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });

async function exportAll() {
  toast("Đang gom dữ liệu…", 0);
  const [notes, docs, folders, blobs] = await Promise.all(["notes", "docs", "folders", "blobs"].map(s => db.all(s)));
  const out = { app: "myNote", v: 1, at: Date.now(), notes, docs, folders, blobs: [] };
  for (const b of blobs) out.blobs.push({ id: b.id, data: await blobUrl(b.blob) });
  const a = document.createElement("a");
  const d = new Date();
  a.download = `myNote sao luu ${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}.json`;
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: "application/json" }));
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`Đã xuất ${notes.length} ghi chú`);
}

async function importAll(f) {
  let data;
  try { data = JSON.parse(await f.text()); } catch (e) { return toast("File không đọc được"); }
  if (!data || data.app !== "myNote") return toast("Không phải file sao lưu myNote");
  if (!(await askConfirm("Khôi phục sao lưu?", `Thêm/ghi đè ${data.notes.length} ghi chú từ file này (ghi chú cùng mã sẽ bị thay).`, "Khôi phục"))) return;
  toast("Đang khôi phục…", 0);
  for (const b of data.blobs || []) await db.put("blobs", { id: b.id, blob: await (await fetch(b.data)).blob() });
  for (const s of ["folders", "docs", "notes"]) for (const v of data[s] || []) await db.put(s, v);
  toast(`Đã khôi phục ${data.notes.length} ghi chú`);
  setTimeout(() => location.reload(), 600);
}
