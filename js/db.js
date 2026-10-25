// db.js — kho trong máy (IndexedDB). Bản mẫu chỉ lưu ở đây; bản thật sẽ đồng bộ lên Firebase của AWord.
//   notes   — THẺ ghi chú (nhẹ, thư viện đọc hết): { id, title, folderId, fav, created, updated, pages, thumb }
//   docs    — NỘI DUNG (nặng, chỉ đọc khi mở): { id (= note id), pages: [{ h, paper, img, strokes }] }
//   folders — { id, name, color, created }
//   blobs   — ảnh nền trang (PDF/ảnh chụp): { id, blob }
const NAME = "mynote", VER = 1;
let opening = null;

function open() {
  if (opening) return opening;
  opening = new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const s of ["notes", "docs", "folders", "blobs"]) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: "id" });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return opening;
}

async function run(store, mode, fn) {
  const d = await open();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    let out;
    if (req) req.onsuccess = () => { out = req.result; };
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const db = {
  all: s => run(s, "readonly", st => st.getAll()),
  get: (s, id) => run(s, "readonly", st => st.get(id)),
  put: (s, v) => run(s, "readwrite", st => st.put(v)),
  del: (s, id) => run(s, "readwrite", st => st.delete(id)),
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Xin trình duyệt đừng tự dọn kho khi máy đầy (Safari hay dọn dữ liệu web ít dùng)
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* */ }
