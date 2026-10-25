// pages.js — trang, ảnh nền, ảnh thu nhỏ, nhập PDF / ảnh chụp.
import { db, uid } from "./db.js";
import { renderPage, A4_H, PAGE_W } from "./ink.js";

const imgCache = new Map(), imgReady = new Map();

// Ảnh nền trang (blob trong kho) ⇒ ImageBitmap, nhớ đệm theo id
export function getImg(id) {
  if (!id) return Promise.resolve(null);
  if (!imgCache.has(id)) {
    imgCache.set(id, db.get("blobs", id).then(r => (r ? createImageBitmap(r.blob) : null)).then(b => { imgReady.set(id, b); return b; }).catch(() => null));
  }
  return imgCache.get(id);
}
// Ảnh đã nạp xong thì lấy ĐỒNG BỘ (vẽ lại một vùng nhỏ lúc tẩy không phải chờ promise)
export const peekImg = id => (id ? imgReady.get(id) || null : null);

export const newPage = (paper = "blank") => ({ h: A4_H, paper, strokes: [] });

export async function makeThumb(page) {
  const k = 0.36;
  const c = document.createElement("canvas");
  c.width = Math.round(PAGE_W * k);
  c.height = Math.round(page.h * k);
  renderPage(c.getContext("2d"), page, k, await getImg(page.img));
  return c.toDataURL("image/jpeg", 0.8);
}

export async function blobDataUrl(id) {
  const r = await db.get("blobs", id);
  if (!r) return "";
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => res("");
    fr.readAsDataURL(r.blob);
  });
}

const toBlob = (c, q = 0.86) => new Promise(r => c.toBlob(r, "image/jpeg", q));
const MAX_W = 1600;   // ảnh nền trang lưu rộng 1600 px — đủ nét khi phóng ×1,6 trên iPad, nhẹ khi đồng bộ

export async function importPdf(file, onProg) {
  const pdfjs = await import("../vendor/pdfjs/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    onProg && onProg(i, pdf.numPages);
    const pg = await pdf.getPage(i);
    const vp1 = pg.getViewport({ scale: 1 });
    const vp = pg.getViewport({ scale: MAX_W / vp1.width });
    const c = document.createElement("canvas");
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await pg.render({ canvasContext: ctx, viewport: vp }).promise;
    const id = uid();
    await db.put("blobs", { id, blob: await toBlob(c) });
    pages.push({ h: Math.round((PAGE_W * vp1.height) / vp1.width), paper: "blank", img: id, strokes: [] });
  }
  return pages;
}

export async function importImages(files, onProg) {
  const pages = [];
  let i = 0;
  for (const f of files) {
    onProg && onProg(++i, files.length);
    const bmp = await createImageBitmap(f);
    const sc = Math.min(1, MAX_W / bmp.width);
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const id = uid();
    await db.put("blobs", { id, blob: await toBlob(c) });
    pages.push({ h: Math.round((PAGE_W * bmp.height) / bmp.width), paper: "blank", img: id, strokes: [] });
  }
  return pages;
}

const MONTHS = d => `ngày ${d.getDate()} thg ${d.getMonth() + 1}, ${d.getFullYear()}`;
export const fmtDate = t => MONTHS(new Date(t));
