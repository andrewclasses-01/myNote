// firebase.js — myNote dùng CHUNG dự án Firebase của AWord (aword-70dae): đăng nhập Google CÙNG tài khoản thầy
// ⇒ cùng uid ⇒ iPad và máy chiếu gặp nhau ở `users/{uid}/items` (đường luật Firestore đã mở cho dữ liệu riêng của thầy).
// Cấu hình web Firebase là CÔNG KHAI theo thiết kế (chép từ AWord core/firebase.js) — bảo vệ thật nằm ở luật Firestore.
// ⛔ KHÔNG gọi setPersistence (bẫy phiên chuyền qua lại giữa IndexedDB/localStorage — xem hồ sơ myLesson).
// ⚠️ Tên miền note.andrewclasses.com phải có trong Firebase ▸ Authentication ▸ Authorized domains thì popup đăng nhập mới chạy.
const SDK = "https://www.gstatic.com/firebasejs/12.9.0";
const config = {
  apiKey: "AIzaSyAV_yoyAQM2fKKdOsJyuAxxf4AN7MsF7XY",
  authDomain: "aword-70dae.firebaseapp.com",
  projectId: "aword-70dae",
  storageBucket: "aword-70dae.firebasestorage.app",
  messagingSenderId: "399279049436",
  appId: "1:399279049436:web:b9b34dcfb34732aa744219",
};
export const TEACHER_EMAIL = "namdaptrai01@gmail.com";

let appP = null, authP = null, dbP = null;
const app = () => (appP ||= import(`${SDK}/firebase-app.js`).then(m => (m.getApps().length ? m.getApp() : m.initializeApp(config))));
export const auth = () => (authP ||= Promise.all([import(`${SDK}/firebase-auth.js`), app()]).then(([m, a]) => m.getAuth(a)));
export const db = () => (dbP ||= Promise.all([import(`${SDK}/firebase-firestore.js`), app()]).then(([m, a]) => m.getFirestore(a)));
export const fs = () => import(`${SDK}/firebase-firestore.js`);

const isTeacher = u => !!u && (u.email || "").toLowerCase() === TEACHER_EMAIL;

let user = null, known = false;
const subs = new Set();
// Nạp sẵn lúc mở app ⇒ lúc bấm nút đăng nhập, popup mở NGAY trong cú bấm (Safari chặn popup mở trễ)
export function watchUser(cb) {
  subs.add(cb);
  if (known) cb(user);
  return () => subs.delete(cb);
}
(async () => {
  try {
    const [{ onAuthStateChanged }, a] = await Promise.all([import(`${SDK}/firebase-auth.js`), auth()]);
    onAuthStateChanged(a, u => { user = isTeacher(u) ? u : null; known = true; subs.forEach(cb => cb(user)); });
  } catch (e) { console.warn("firebase", e); known = true; subs.forEach(cb => cb(null)); }
})();

export const getUser = () => user;
export function currentUser() {
  if (known) return Promise.resolve(user);
  return new Promise(res => { const off = watchUser(u => { off(); res(u); }); });
}

export async function signIn() {
  const [{ GoogleAuthProvider, signInWithPopup, signOut: so }, a] = await Promise.all([import(`${SDK}/firebase-auth.js`), auth()]);
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account", login_hint: TEACHER_EMAIL });
  const { user: u } = await signInWithPopup(a, p);
  if (!isTeacher(u)) { await so(a); const e = new Error("Chỉ tài khoản AWord của thầy dùng được LIVE."); e.code = "nt/not-teacher"; throw e; }
  return u;
}
export async function signOut() {
  const [{ signOut: so }, a] = await Promise.all([import(`${SDK}/firebase-auth.js`), auth()]);
  await so(a);
}

// Kênh bắt tay LIVE: 2 tài liệu trong users/{uid}/items. ⚠️ kind "note-link" PHẢI có trong APP_DATA_KINDS của AWord (core/store.js).
const DOC = { host: "note_host", pad: "note_pad" };
const envelope = id => ({ id, kind: "note-link", root: "showdown", parentId: null, trashed: false });
export function firestoreSignal() {
  return {
    async write(name, patch) {
      const u = await currentUser();
      if (!u) throw Object.assign(new Error("Chưa đăng nhập"), { code: "nt/signed-out" });
      const [d, { doc, setDoc }] = await Promise.all([db(), fs()]);
      await setDoc(doc(d, `users/${u.uid}/items`, DOC[name]), { ...envelope(DOC[name]), ...patch }, { merge: true });
    },
    listen(name, cb) {
      let stop = null, dead = false;
      (async () => {
        try {
          const u = await currentUser();
          if (!u) throw new Error("Chưa đăng nhập");
          const [d, { doc, onSnapshot }] = await Promise.all([db(), fs()]);
          if (dead) return;
          stop = onSnapshot(doc(d, `users/${u.uid}/items`, DOC[name]),
            s => { if (!dead) cb(s.exists() ? s.data() : null); },
            err => { console.warn("NOTE signal", err); if (!dead) cb(null); });
        } catch (e) { console.warn("NOTE signal", e); if (!dead) cb(null); }
      })();
      return () => { dead = true; if (stop) try { stop(); } catch (e) { /* */ } };
    },
  };
}
