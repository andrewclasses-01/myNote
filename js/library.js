// library.js — THƯ VIỆN: thanh bên (Trang chủ / Ghi chú / Yêu thích / Thư mục) + lưới thẻ ghi chú, giống Notability.
import { db, uid } from "./db.js";
import { icon } from "./icons.js";
import { newPage, makeThumb, importPdf, importImages, fmtDate } from "./pages.js";
import { popMenu, askText, askConfirm, toast, onHold, esc } from "./ui.js";
import { openSettings } from "./settings.js";

const FOLDER_COLORS = ["#7c3aed", "#e11d48", "#0ea5e9", "#16a34a", "#f59e0b", "#64748b", "#db2777", "#0d9488"];
const VIEW_KEY = "mynote.view";

function loadView() {
  try { return JSON.parse(sessionStorage.getItem(VIEW_KEY)) || { kind: "home" }; } catch (e) { return { kind: "home" }; }
}
function saveView(v) { try { sessionStorage.setItem(VIEW_KEY, JSON.stringify(v)); } catch (e) { /* */ } }

export async function createNote({ title = "Ghi chú mới", folderId = "", pages = null, paper = "blank" } = {}) {
  const id = uid();
  const doc = { id, pages: pages || [newPage(paper)] };
  const now = Date.now();
  const meta = { id, title, folderId, fav: false, created: now, updated: now, pages: doc.pages.length, thumb: await makeThumb(doc.pages[0]) };
  await db.put("docs", doc);
  await db.put("notes", meta);
  return id;
}

export async function showLibrary(root) {
  let view = loadView();
  let notes = [], folders = [], q = "";

  root.innerHTML = `
  <div class="lib">
    <aside class="side">
      <div class="brand"><img src="icons/icon-192.png" alt=""><div><b>myNote</b><small>ANDREW CLASSES</small></div></div>
      <label class="search">${icon("search")}<input placeholder="Tìm kiếm" spellcheck="false"></label>
      <nav class="side-nav"></nav>
      <div class="side-h"><span>Thư mục</span><button class="icon-btn" data-act="addFolder" title="Thư mục mới">${icon("plus")}</button></div>
      <div class="folders"></div>
      <div class="side-foot"><span class="sync-dot"></span><span>Bản mẫu · lưu trong máy này</span><button class="icon-btn" data-act="settings" title="Cài đặt">${icon("settings")}</button></div>
    </aside>
    <main class="main">
      <header class="main-h">
        <h1></h1>
        <div class="main-acts">
          <button class="icon-btn round big" data-act="aword" title="Màn NOTE AWord (bản mẫu màn máy chiếu)" aria-label="Màn NOTE AWord">${icon("cast")}</button>
          <button class="btn primary" data-act="new">${icon("plus")}<span>Mới</span></button>
        </div>
      </header>
      <section class="quick"></section>
      <div class="grid"></div>
    </main>
    <input type="file" class="hidden" data-file="pdf" accept="application/pdf">
    <input type="file" class="hidden" data-file="img" accept="image/*" multiple>
  </div>`;

  const $ = s => root.querySelector(s);
  const nav = $(".side-nav"), foldersEl = $(".folders"), grid = $(".grid"), h1 = $("h1"), quick = $(".quick");

  async function load() {
    [notes, folders] = await Promise.all([db.all("notes"), db.all("folders")]);
    notes.sort((a, b) => b.updated - a.updated);
    folders.sort((a, b) => a.created - b.created);
  }

  function go(v) { view = { ...view, ...v }; saveView(view); render(); }

  function renderSide() {
    const navs = [
      { kind: "home", ic: "home", label: "Trang chủ" },
      { kind: "all", ic: "notebook", label: "Ghi chú", n: notes.length },
      { kind: "fav", ic: "star", label: "Yêu thích", n: notes.filter(n => n.fav).length },
    ];
    // thầy 25/10: số mục chỉ hiện ở mục ĐANG CHỌN, không hiện sẵn
    nav.innerHTML = navs.map(n => `<button class="nav-it ${view.kind === n.kind ? "on" : ""}" data-kind="${n.kind}">${icon(n.ic)}<span>${n.label}</span>${n.n != null && view.kind === n.kind ? `<em>${n.n.toLocaleString("vi-VN")}</em>` : ""}</button>`).join("");
    nav.querySelectorAll("[data-kind]").forEach(b => (b.onclick = () => go({ kind: b.dataset.kind, folderId: "" })));
    foldersEl.innerHTML = folders.length ? "" : `<div class="side-empty">Chưa có thư mục — bấm + để tạo</div>`;
    for (const f of folders) {
      const on = view.kind === "folder" && view.folderId === f.id;
      const n = on ? notes.filter(x => x.folderId === f.id).length : 0;
      const b = document.createElement("button");
      b.className = "nav-it folder" + (on ? " on" : "");
      b.innerHTML = `<span class="fic" style="color:${f.color}">${icon("folder")}</span><span>${esc(f.name)}</span>${on ? `<em>${n}</em>` : ""}`;
      b.onclick = () => go({ kind: "folder", folderId: f.id });
      onHold(b, (x, y) => popMenu(x, y, [
        { icon: "rename", label: "Đổi tên", onClick: () => renameFolder(f) },
        { icon: "palette", label: "Đổi màu", sub: FOLDER_COLORS.map(c => ({ dot: c, label: c === f.color ? "Đang dùng" : "Màu này", onClick: async () => { f.color = c; await db.put("folders", f); render(); } })) },
        "-",
        { icon: "trash", label: "Xoá thư mục", danger: true, onClick: () => deleteFolder(f) },
      ]));
      foldersEl.append(b);
    }
  }

  function filtered() {
    let list = notes;
    if (view.kind === "folder") list = list.filter(n => n.folderId === view.folderId);
    if (view.kind === "fav") list = list.filter(n => n.fav);
    if (q) { const k = q.toLowerCase(); list = list.filter(n => n.title.toLowerCase().includes(k)); }
    return list;
  }

  function renderMain() {
    const folder = folders.find(f => f.id === view.folderId);
    h1.textContent = q ? `Kết quả cho “${q}”` : view.kind === "home" ? "Chào thầy Andrew" : view.kind === "fav" ? "Yêu thích" : folder ? folder.name : "Ghi chú";

    quick.innerHTML = view.kind === "home" && !q ? `
      <button class="qa" data-act="blank"><span class="qa-ic" style="--c:#2563eb">${icon("filePlus")}</span><b>Ghi chú mới</b><small>Giấy trắng, kẻ dòng, ô vuông</small></button>
      <button class="qa" data-act="pdf"><span class="qa-ic" style="--c:#e11d48">${icon("file")}</span><b>Nhập PDF</b><small>Đáp án, bài tập để chữa</small></button>
      <button class="qa" data-act="img"><span class="qa-ic" style="--c:#16a34a">${icon("image")}</span><b>Nhập ảnh</b><small>Ảnh chụp bài làm của em</small></button>
      <button class="qa" data-act="aword"><span class="qa-ic" style="--c:#f59e0b">${icon("cast")}</span><b>LIVE lên AWord</b><small>Viết trên iPad, hiện lên máy chiếu</small></button>
      <h2 class="sec-h">Gần đây</h2>` : "";
    quick.querySelectorAll("[data-act]").forEach(b => (b.onclick = () => act(b.dataset.act)));

    let list = filtered();
    if (view.kind === "home" && !q) list = list.slice(0, 12);
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = `<div class="empty">${icon("notebook")}<b>${q ? "Không thấy ghi chú nào" : "Chưa có ghi chú"}</b><span>Bấm <b>+ Mới</b> để tạo ghi chú, nhập PDF hoặc ảnh chụp.</span></div>`;
      return;
    }
    for (const n of list) {
      const c = document.createElement("div");
      c.className = "card";
      c.innerHTML = `<div class="thumb">${n.thumb ? `<img src="${n.thumb}" alt="">` : ""}${n.fav ? `<span class="fav">${icon("star")}</span>` : ""}<span class="pc">${n.pages} tr</span></div>
        <div class="card-b"><div><b>${esc(n.title)}</b><small>${fmtDate(n.updated)}</small></div><button class="icon-btn more" title="Tuỳ chọn">${icon("more")}</button></div>`;
      c.onclick = e => { if (!e.target.closest(".more")) location.hash = "#/note/" + n.id; };
      const menu = (x, y) => popMenu(x, y, noteMenu(n));
      c.querySelector(".more").onclick = e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); menu(r.left - 150, r.bottom + 6); };
      onHold(c, menu);
      grid.append(c);
    }
  }

  function noteMenu(n) {
    return [
      { icon: "rename", label: "Đổi tên", onClick: async () => { const r = await askText("Đổi tên ghi chú", n.title); if (r) { n.title = r.value; await db.put("notes", n); render(); } } },
      { icon: "star", label: n.fav ? "Bỏ yêu thích" : "Yêu thích", onClick: async () => { n.fav = !n.fav; await db.put("notes", n); render(); } },
      { icon: "folder", label: "Chuyển vào thư mục", sub: [
        { icon: "inbox", label: "Chưa phân loại", on: !n.folderId, onClick: () => move(n, "") },
        ...folders.map(f => ({ dot: f.color, label: f.name, on: n.folderId === f.id, onClick: () => move(n, f.id) })),
      ] },
      { icon: "copy", label: "Nhân bản", onClick: () => duplicate(n) },
      "-",
      { icon: "trash", label: "Xoá ghi chú", danger: true, onClick: () => removeNote(n) },
    ];
  }

  async function move(n, folderId) { n.folderId = folderId; await db.put("notes", n); render(); toast(folderId ? "Đã chuyển vào thư mục" : "Đã chuyển về Chưa phân loại"); }
  async function duplicate(n) {
    const doc = await db.get("docs", n.id);
    if (!doc) return;
    const id = uid(), now = Date.now();
    await db.put("docs", { ...structuredClone(doc), id });
    await db.put("notes", { ...n, id, title: n.title + " (bản sao)", created: now, updated: now });
    await load(); render(); toast("Đã nhân bản");
  }
  async function removeNote(n) {
    if (!(await askConfirm("Xoá ghi chú?", `“${n.title}” sẽ bị xoá khỏi máy này.`))) return;
    const doc = await db.get("docs", n.id);
    for (const p of (doc && doc.pages) || []) if (p.img) await db.del("blobs", p.img);
    await db.del("docs", n.id); await db.del("notes", n.id);
    await load(); render(); toast("Đã xoá");
  }
  async function renameFolder(f) { const r = await askText("Đổi tên thư mục", f.name); if (r) { f.name = r.value; await db.put("folders", f); render(); } }
  async function deleteFolder(f) {
    if (!(await askConfirm("Xoá thư mục?", `Thư mục “${f.name}” bị xoá, các ghi chú bên trong chuyển về Chưa phân loại.`))) return;
    for (const n of notes.filter(x => x.folderId === f.id)) { n.folderId = ""; await db.put("notes", n); }
    await db.del("folders", f.id);
    if (view.folderId === f.id) view = { kind: "all" };
    await load(); render();
  }

  const curFolder = () => (view.kind === "folder" ? view.folderId : "");

  async function act(a, ev) {
    if (a === "new") {
      const r = ev ? ev.currentTarget.getBoundingClientRect() : { left: innerWidth - 260, bottom: 80 };
      popMenu(r.left - 120, r.bottom + 8, [
        { icon: "filePlus", label: "Ghi chú trống", onClick: () => act("blank") },
        { icon: "grid", label: "Ghi chú giấy…", sub: [["blank", "Giấy trắng"], ["lined", "Kẻ dòng"], ["grid", "Ô vuông"], ["dots", "Chấm"]].map(([p, l]) => ({ label: l, onClick: () => act("blank:" + p) })) },
        "-",
        { icon: "file", label: "Nhập PDF", onClick: () => act("pdf") },
        { icon: "image", label: "Nhập ảnh", onClick: () => act("img") },
      ]);
      return;
    }
    if (a.startsWith("blank")) {
      const paper = a.split(":")[1] || localStorage.getItem("mynote.paper") || "blank";
      try { localStorage.setItem("mynote.paper", paper); } catch (e) { /* */ }
      const id = await createNote({ folderId: curFolder(), paper });
      location.hash = "#/note/" + id;
      return;
    }
    if (a === "pdf") return root.querySelector('[data-file="pdf"]').click();
    if (a === "img") return root.querySelector('[data-file="img"]').click();
    if (a === "aword") return window.open("aword-note.html", "_blank");
    if (a === "settings") return openSettings(() => render());
    if (a === "addFolder") {
      const r = await askText("Thư mục mới", "", "Tạo");
      if (!r) return;
      await db.put("folders", { id: uid(), name: r.value, color: FOLDER_COLORS[folders.length % FOLDER_COLORS.length], created: Date.now() });
      await load(); render();
    }
  }

  root.querySelectorAll("[data-act]").forEach(b => (b.onclick = e => act(b.dataset.act, e)));
  $('[data-file="pdf"]').onchange = async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const pages = await importPdf(f, (i, n) => toast(`Đang nhập PDF… trang ${i}/${n}`, 0));
      const id = await createNote({ title: f.name.replace(/\.pdf$/i, ""), folderId: curFolder(), pages });
      toast(`Đã nhập ${pages.length} trang`);
      location.hash = "#/note/" + id;
    } catch (err) { console.error(err); toast("Không đọc được PDF này"); }
  };
  $('[data-file="img"]').onchange = async e => {
    const files = [...e.target.files]; e.target.value = "";
    if (!files.length) return;
    try {
      const pages = await importImages(files, (i, n) => toast(`Đang nhập ảnh ${i}/${n}…`, 0));
      const id = await createNote({ title: files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : `Ảnh chụp (${files.length})`, folderId: curFolder(), pages });
      toast(`Đã nhập ${pages.length} ảnh`);
      location.hash = "#/note/" + id;
    } catch (err) { console.error(err); toast("Không đọc được ảnh"); }
  };
  const search = $(".search input");
  search.oninput = () => { q = search.value.trim(); renderMain(); };

  function render() { renderSide(); renderMain(); }
  await load();
  render();
  return null;
}
