// note-link.js — ĐƯỜNG NỐI myNote (iPad) ⇄ nút NOTE của AWord (máy chiếu).
// ⚠️ CHÉP NGUYÊN VĂN giữa myNote `js/note-link.js` và AWord `core/note-link.js` — sửa ở myNote rồi chép (file không import gì).
//
// Khuôn y AWord `templates/rocket-race/rr-padlink.js` (thầy đã thử iPad thật): dữ liệu đi WebRTC DataChannel nối thẳng (cùng Wi-Fi);
// kho chỉ để 2 máy tìm thấy nhau + đường DỰ PHÒNG. Kho = 2 tài liệu, MỖI CÁI ĐÚNG MỘT NGƯỜI GHI:
//   "host" — máy chiếu ghi: { sid (phiên màn NOTE), n (nonce iPad đang được phục vụ), o (offer), h (đáp nudge) }
//   "pad"  — iPad ghi:      { sid (phiên nó đang nhắm), nonce, live (0/1), answer, hc (nudge), b (nhịp sống), fb (bản trang dự phòng) }
// Bắt tay: iPad thấy host.sid ⇒ chào {nonce} ⇒ máy chiếu offer ⇒ iPad answer ⇒ kênh mở. Lời báo của kho có thể RƠI ⇒ iPad tăng `hc`
//   mỗi 4 s (tối đa 8), máy chiếu thấy `hc` tăng mà chưa xong thì ghi lại offer kèm `h` mới.
// Wi-Fi chặn nối thẳng ⇒ iPad ghi `fb` = {t, doc, page, view} (≤ 1 lần/0,7 s) — máy chiếu vẫn thấy trang, chậm hơn, không ảnh nền.
// ⛔ Không so đồng hồ 2 máy — chỉ so sid / nonce / số đếm.
// signal = { write(name, patch) → Promise, listen(name, cb(data|null)) → unsub }

const ICE = [{ urls: "stun:stun.l.google.com:19302" }];
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
function gather(pc, ms) {
  return new Promise(res => {
    if (pc.iceGatheringState === "complete") return res();
    const t = setTimeout(res, ms);
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } });
  });
}
const sdpOf = pc => JSON.stringify({ type: pc.localDescription.type, sdp: pc.localDescription.sdp });

// Tin dài (ảnh nền trang ~200 KB) cắt khúc 12 KB — Safari/Chrome giới hạn cỡ một tin DataChannel.
const CHUNK = 12000;
function packer(send) {
  return m => {
    const s = JSON.stringify(m);
    if (s.length <= CHUNK) return send(s);
    const id = rid(), n = Math.ceil(s.length / CHUNK);
    for (let i = 0; i < n; i++) send(JSON.stringify({ k: "ck", id, i, n, d: s.slice(i * CHUNK, (i + 1) * CHUNK) }));
  };
}
function unpacker(cb) {
  const parts = new Map();
  return raw => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.k !== "ck") return cb(m);
    let p = parts.get(m.id);
    if (!p) { p = { n: m.n, got: 0, a: [] }; parts.set(m.id, p); }
    if (p.a[m.i] == null) { p.a[m.i] = m.d; p.got++; }
    if (p.got === p.n) { parts.delete(m.id); try { cb(JSON.parse(p.a.join(""))); } catch (e) { /* hỏng thì bỏ */ } }
  };
}

// =================================================================== MÁY CHIẾU (AWord, màn NOTE đang mở)
// state: "wait" (chưa có iPad LIVE) · "connecting" · "on" (nối thẳng) · "relay" (đi kho)
export function createNoteHost({ signal, onMessage, onState }) {
  let sid = "", pc = null, dc = null, served = "", offered = "", hc = 0, padLive = false, hasFb = false, lastFb = -1, unsub = null, s = "";
  const open = () => !!dc && dc.readyState === "open";
  const status = () => { const v = open() ? "on" : !padLive ? "wait" : hasFb ? "relay" : "connecting"; if (v !== s) { s = v; onState && onState(v); } };
  const send = packer(str => { if (open()) try { dc.send(str); } catch (e) { /* */ } });
  const recv = unpacker(m => onMessage(m));
  function drop() { try { dc && dc.close(); } catch (e) { /* */ } try { pc && pc.close(); } catch (e) { /* */ } pc = dc = null; }

  async function offerFor(nonce) {
    drop();
    served = nonce; offered = "";
    const p = new RTCPeerConnection({ iceServers: ICE }); pc = p;
    const ch = p.createDataChannel("note", { ordered: true }); dc = ch;
    const lost = () => { if (pc === p) { drop(); status(); } };
    ch.onopen = () => { if (pc === p) { status(); send({ k: "need" }); } };
    ch.onmessage = e => recv(e.data);
    ch.onclose = lost;
    p.onconnectionstatechange = () => { if (p.connectionState === "failed" || p.connectionState === "closed") lost(); };
    await p.setLocalDescription(await p.createOffer());
    await gather(p, 2500);
    if (pc !== p) return;
    offered = sdpOf(p);
    await signal.write("host", { sid, n: nonce, o: offered, h: hc });
  }

  function onPad(d) {
    if (!d || d.sid !== sid || !d.live) { padLive = false; hasFb = false; if (!d || !d.live) drop(); status(); return; }
    padLive = true;
    if (d.nonce && d.nonce !== served) { hc = +d.hc || 0; offerFor(d.nonce).catch(e => console.warn("NOTE offer", e)); }
    else if (d.nonce === served && d.answer && pc && !pc.remoteDescription) pc.setRemoteDescription(JSON.parse(d.answer)).catch(e => console.warn("NOTE answer", e));
    else if (d.nonce === served && !d.answer && offered && (+d.hc || 0) > hc) { hc = +d.hc; signal.write("host", { sid, n: served, o: offered, h: hc }).catch(() => {}); }
    hasFb = !!d.fb;
    if (d.fb && !open() && d.fb.t !== lastFb) {
      lastFb = d.fb.t;
      const f = d.fb;
      if (f.doc) onMessage({ k: "doc", ...f.doc });
      if (f.page && f.doc) onMessage({ k: "page", pi: f.doc.pi, page: f.page });
      if (f.view) onMessage({ k: "view", ...f.view });
    }
    status();
  }

  return {
    start() {
      if (sid) return;
      sid = rid(); served = ""; lastFb = -1;
      status();
      signal.write("host", { sid, n: "", o: "", h: 0 }).catch(e => console.warn("NOTE host", e));
      unsub = signal.listen("pad", onPad);
    },
    stop() {
      if (!sid) return;
      unsub && unsub(); unsub = null;
      drop(); sid = ""; padLive = false;
      signal.write("host", { sid: "", n: "", o: "" }).catch(() => {});
      status();
    },
    send(m) { send(m); },
    get state() { return s; },
  };
}

// Nút NOTE trên trang chủ AWord: có iPad đang LIVE không? (nhịp `b` phải ĐỔI trong 40 s gần nhất, đo bằng đồng hồ máy này)
export function watchPadLive(signal, cb) {
  let lastB = null, seenAt = 0, live = false, t = 0;
  const set = v => { if (v !== live) { live = v; cb(v); } };
  const unsub = signal.listen("pad", d => {
    if (!d || !d.live) { lastB = d ? d.b : null; set(false); return; }
    if (lastB !== null && d.b !== lastB) seenAt = performance.now();
    lastB = d.b;
    set(seenAt > 0 && performance.now() - seenAt < 40000);
  });
  t = setInterval(() => set(seenAt > 0 && live && performance.now() - seenAt < 40000), 5000);
  return () => { clearInterval(t); unsub(); };
}

// =================================================================== iPAD (myNote, nút LIVE bật)
// state: "off" · "wait" (chưa có màn NOTE mở) · "connecting" · "on" · "relay"
export function createNotePad({ signal, onMessage, onState }) {
  let on = false, sid = "", nonce = "", pc = null, dc = null, tries = 0, nudge = 0, beat = 0, b = 0, s = "off", unsub = null, fbTimer = 0, fbT = 0;
  const mirror = { doc: null, pages: new Map(), view: null, pend: new Map() };
  const open = () => !!dc && dc.readyState === "open";
  const set = v => { if (v !== s) { s = v; onState && onState(v); } };
  const send = packer(str => { if (open()) try { dc.send(str); } catch (e) { /* */ } });
  const recv = unpacker(m => onMessage && onMessage(m));
  function drop() { try { dc && dc.close(); } catch (e) { /* */ } try { pc && pc.close(); } catch (e) { /* */ } pc = dc = null; }

  function hello() {
    drop();
    nonce = rid(); tries = 0;
    set("connecting");
    signal.write("pad", { sid, nonce, live: 1, answer: "", hc: 0, b }).catch(e => console.warn("NOTE hello", e));
    clearInterval(nudge);
    nudge = setInterval(() => {
      if (open() || !on) return clearInterval(nudge);
      if (++tries > 8) { clearInterval(nudge); set("relay"); writeFb(); return; }
      signal.write("pad", { sid, nonce, hc: tries }).catch(() => {});
    }, 4000);
    writeFb();
  }

  async function answer(offer) {
    drop();
    const p = new RTCPeerConnection({ iceServers: ICE }); pc = p; p._o = offer;
    const lost = () => {
      if (pc !== p) return;
      drop();
      if (on && sid) { set("connecting"); setTimeout(() => { if (on && sid && !open() && !pc) hello(); }, 1500); }
    };
    p.ondatachannel = e => {
      const ch = e.channel; dc = ch;
      ch.onopen = () => { if (pc === p) { clearInterval(nudge); set("on"); } };
      ch.onmessage = ev => recv(ev.data);
      ch.onclose = lost;
    };
    p.onconnectionstatechange = () => { if (p.connectionState === "failed" || p.connectionState === "closed") lost(); };
    await p.setRemoteDescription(JSON.parse(offer));
    await p.setLocalDescription(await p.createAnswer());
    await gather(p, 2500);
    if (pc !== p) return;
    await signal.write("pad", { sid, nonce, answer: sdpOf(p) });
  }

  function onHost(d) {
    if (!on) return;
    if (!d || !d.sid) { sid = ""; drop(); clearInterval(nudge); set("wait"); return; }
    if (d.sid !== sid) { sid = d.sid; hello(); return; }
    if (d.n === nonce && d.o && (!pc || pc._o !== d.o)) answer(d.o).catch(e => console.warn("NOTE answer", e));
  }

  // bản trang dự phòng qua kho (chỉ khi chưa nối thẳng)
  function writeFb() {
    if (!on || !sid || open() || fbTimer) return;
    fbTimer = setTimeout(() => {
      fbTimer = 0;
      if (!on || !sid || open() || !mirror.doc) return;
      const page = mirror.pages.get(mirror.doc.pi) || null;
      let fb = { t: ++fbT, doc: mirror.doc, page, view: mirror.view };
      if (JSON.stringify(fb).length > 800000) fb = { t: fbT, doc: mirror.doc, page: page && { ...page, strokes: [] }, view: mirror.view };
      signal.write("pad", { fb }).catch(e => console.warn("NOTE relay", e));
    }, 700);
  }

  function track(m) {
    if (m.k === "doc") mirror.doc = { title: m.title, n: m.n, pi: m.pi };
    else if (m.k === "page") mirror.pages.set(m.pi, { ...m.page, strokes: m.page.strokes.slice() });
    else if (m.k === "s0") mirror.pend.set(m.s.id, m.pi);
    else if (m.k === "s1") { const pi = mirror.pend.get(m.id); mirror.pend.delete(m.id); const pg = mirror.pages.get(pi); if (pg) pg.strokes.push(m.s); }
    else if (m.k === "view") mirror.view = { pi: m.pi, x0: m.x0, y0: m.y0, x1: m.x1, y1: m.y1 };
    else return false;
    return m.k !== "s0";
  }

  const vis = () => { if (on && document.visibilityState === "visible" && sid && !open()) hello(); };

  return {
    start() {
      if (on) return;
      on = true; sid = ""; set("wait");
      unsub = signal.listen("host", onHost);
      beat = setInterval(() => { if (on && document.visibilityState === "visible") signal.write("pad", { live: 1, b: ++b }).catch(() => {}); }, 15000);
      document.addEventListener("visibilitychange", vis);
    },
    stop() {
      if (!on) return;
      on = false;
      unsub && unsub(); unsub = null;
      clearInterval(nudge); clearInterval(beat); clearTimeout(fbTimer); fbTimer = 0;
      document.removeEventListener("visibilitychange", vis);
      drop();
      signal.write("pad", { live: 0, nonce: "", answer: "", fb: null }).catch(() => {});
      sid = ""; mirror.pages.clear(); mirror.doc = null;
      set("off");
    },
    send(m) {
      if (!on) return;
      const changed = track(m);
      if (open()) send(m);
      else if (changed) writeFb();
    },
    get on() { return on; },
    get state() { return s; },
  };
}

// =================================================================== bàn thử: 2 tab cùng trình duyệt, không đăng nhập (?padsig=local)
export function localSignal(prefix) {
  const bc = new BroadcastChannel("notesig-" + prefix);
  const subs = new Map();
  const key = n => `notesig.${prefix}.${n}`;
  const read = n => { try { return JSON.parse(localStorage.getItem(key(n))); } catch (e) { return null; } };
  bc.onmessage = e => { const a = subs.get(e.data); if (a) a.forEach(cb => cb(read(e.data))); };
  return {
    async write(n, patch) {
      localStorage.setItem(key(n), JSON.stringify({ ...(read(n) || {}), ...patch }));
      bc.postMessage(n);
      const a = subs.get(n); if (a) setTimeout(() => a.forEach(cb => cb(read(n))));
    },
    listen(n, cb) {
      if (!subs.has(n)) subs.set(n, []);
      subs.get(n).push(cb);
      setTimeout(() => cb(read(n)));
      return () => { const a = subs.get(n); a.splice(a.indexOf(cb), 1); };
    },
  };
}
