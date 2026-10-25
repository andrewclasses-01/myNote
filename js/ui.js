// ui.js — menu nổi, hộp hỏi chữ, hộp xác nhận, thông báo nhỏ (không dùng prompt/confirm của trình duyệt).
import { icon } from "./icons.js";

export const $ = (sel, el = document) => el.querySelector(sel);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let openMenu = null;
export function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; } }

// items: [{ icon, label, danger, onClick, sub:[...] }] | "-"
export function popMenu(x, y, items) {
  closeMenu();
  const back = document.createElement("div");
  back.className = "menu-back";
  const m = document.createElement("div");
  m.className = "menu";
  const fill = (list) => {
    m.innerHTML = "";
    for (const it of list) {
      if (it === "-") { m.append(Object.assign(document.createElement("div"), { className: "menu-sep" })); continue; }
      const b = document.createElement("button");
      b.className = "menu-it" + (it.danger ? " danger" : "") + (it.on ? " on" : "");
      b.innerHTML = (it.icon ? icon(it.icon) : it.dot ? `<i class="dot" style="background:${it.dot}"></i>` : "") + `<span>${esc(it.label)}</span>` + (it.sub ? icon("right", "sm") : "");
      b.onclick = ev => {
        ev.stopPropagation();
        if (it.sub) { fill([{ icon: "back", label: "Quay lại", onClick: () => fill(items), keep: true }, "-", ...it.sub]); place(); return; }
        if (!it.keep) closeMenu();
        it.onClick && it.onClick();
      };
      m.append(b);
    }
  };
  const place = () => {
    const r = m.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + "px";
    m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + "px";
  };
  fill(items);
  back.append(m);
  back.addEventListener("pointerdown", e => { if (e.target === back) closeMenu(); });
  document.body.append(back);
  openMenu = back;
  place();
  requestAnimationFrame(() => m.classList.add("in"));
}

function modal(inner) {
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `<div class="modal">${inner}</div>`;
  document.body.append(back);
  requestAnimationFrame(() => back.classList.add("in"));
  return back;
}

export function askText(title, value = "", ok = "Lưu", extra = "") {
  return new Promise(res => {
    const b = modal(`<h3>${esc(title)}</h3><input class="field" value="${esc(value)}" spellcheck="false">${extra}
      <div class="modal-acts"><button class="btn ghost" data-a="no">Huỷ</button><button class="btn primary" data-a="ok">${esc(ok)}</button></div>`);
    const inp = b.querySelector("input");
    setTimeout(() => { inp.focus(); inp.select(); }, 60);
    const done = v => { b.remove(); res(v); };
    b.querySelector('[data-a="no"]').onclick = () => done(null);
    b.querySelector('[data-a="ok"]').onclick = () => done(inp.value.trim() ? { value: inp.value.trim(), el: b } : null);
    inp.onkeydown = e => { if (e.key === "Enter") b.querySelector('[data-a="ok"]').click(); if (e.key === "Escape") done(null); };
    b.addEventListener("pointerdown", e => { if (e.target === b) done(null); });
  });
}

export function askConfirm(title, text, ok = "Xoá") {
  return new Promise(res => {
    const b = modal(`<h3>${esc(title)}</h3><p>${esc(text)}</p>
      <div class="modal-acts"><button class="btn ghost" data-a="no">Huỷ</button><button class="btn danger" data-a="ok">${esc(ok)}</button></div>`);
    const done = v => { b.remove(); res(v); };
    b.querySelector('[data-a="no"]').onclick = () => done(false);
    b.querySelector('[data-a="ok"]').onclick = () => done(true);
    b.addEventListener("pointerdown", e => { if (e.target === b) done(false); });
  });
}

let toastEl = null, toastT = 0;
export function toast(msg, ms = 2200) {
  if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.append(toastEl); }
  toastEl.textContent = msg;
  toastEl.classList.add("in");
  clearTimeout(toastT);
  if (ms) toastT = setTimeout(() => toastEl.classList.remove("in"), ms);
}

// Giữ ~0,55 s (iPad) hoặc chuột phải (máy tính) ⇒ cb(x, y)
export function onHold(el, cb) {
  let t = 0, sx = 0, sy = 0, fired = false;
  el.addEventListener("contextmenu", e => { e.preventDefault(); if (!fired) cb(e.clientX, e.clientY); fired = false; });
  el.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse") return;
    sx = e.clientX; sy = e.clientY; fired = false;
    t = setTimeout(() => { fired = true; cb(sx, sy); }, 550);
  });
  const stop = () => clearTimeout(t);
  el.addEventListener("pointermove", e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10) stop(); });
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
  el.addEventListener("click", e => { if (fired) { e.preventDefault(); e.stopImmediatePropagation(); fired = false; } }, true);
}
