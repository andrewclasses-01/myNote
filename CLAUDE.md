# myNote — ghi chú viết tay cho iPad, LIVE lên AWord

## Mục đích
App web (PWA, cài lên Màn hình chính iPad) thay Notability cho lớp học của thầy Andrew:
- Viết vẽ bằng Apple Pencil (có lực nhấn), dạ quang, tẩy, lasso, gõ chữ, bút laser; nhập PDF / ảnh chụp bài làm để chữa.
- Thư viện kiểu Notability: Trang chủ, Ghi chú, Yêu thích, Thư mục (KHÔNG có hàng tab — thầy bỏ 25/10); số mục chỉ hiện ở mục đang chọn.
- **LIVE**: nét viết trên iPad hiện tức thì trên máy chiếu qua **nút NOTE mới của AWord** (nằm cạnh Showdown / Stats / iPad).
- Đồng bộ ghi chú giữa các máy qua **Firebase của AWord** (đăng nhập cùng tài khoản Google như AWord).
- iPad luôn NẰM NGANG (khung chuẩn 1180×820).

## Trạng thái
**v0.3.2 LIVE** (25/10/2026, commit `960d43d`) — https://note.andrewclasses.com (kho công khai `andrewclasses-01/myNote`, Pages nhánh main,
CNAME ở portal.inet.vn). LIVE thật lên nút NOTE của AWord (Đợt 583–586). Đang tinh chỉnh cảm giác viết trên iPad thật cùng thầy (chặng 4–6).
- Đã có: thư viện, màn viết đủ công cụ, nhập PDF/ảnh, hoàn tác/làm lại, PWA (manifest + sw.js), LIVE WebRTC + Firestore, cử chỉ ngón
  (cuộn, chụm zoom, chạm đúp đổi công cụ, 2 ngón hoàn tác, 3 ngón làm lại), Cài đặt + sao lưu .json.
- CHƯA có: ĐỒNG BỘ ghi chú giữa các máy — ghi chú chỉ lưu IndexedDB trong máy (Cài đặt ▸ Sao lưu để chép). Đăng nhập Google chỉ để LIVE.

## Chạy / thử
- Máy tính: preview `mynote` trong `D:\OTHERS\CLAUDE\.claude\launch.json` (python http.server cổng 9040, bind 0.0.0.0).
- Thầy tự chạy: bấm đúp `CHAY THU TREN IPAD.bat` ⇒ mở máy chủ cổng 9040 + in địa chỉ để gõ trên iPad (cùng Wi-Fi).
  ⚠️ Qua http://IP (không https) iPad KHÔNG chạy service worker ⇒ chưa dùng offline; "Thêm vào MH chính" vẫn được.
  Bản thật lên GitHub Pages (https) mới đủ PWA.
- Thử LIVE trên 1 máy không đăng nhập: preview `note-lab` (cổng 9041, phục vụ cả `E:\LAP TRINH APP` ⇒ CÙNG origin) —
  `/myNote/?padsig=local` + `/AWord/web/?padsig=local` (mở màn: `import('/AWord/web/core/note-screen.js')` ▸ `openNoteScreen()`).
- ⚠️ Sửa `js/ink.js` hay `js/note-link.js` ⇒ CHÉP sang AWord (`core/note-ink.js` thêm 1 dòng đầu ghi nguồn; `core/note-link.js` nguyên văn) rồi đẩy AWord.
- Đẩy = `git push` (Pages tự dựng ~1 phút, đệm HTML 10 phút); đổi code nhớ tăng `VER` trong `sw.js`.
- Phím tắt máy tính: 1–6 chọn công cụ, Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, Delete xoá vùng chọn, Ctrl + lăn chuột = phóng to.

## Kiến trúc (ES module thuần, không build)
| File | Việc |
|---|---|
| `index.html` + `css/app.css` | vỏ app, toàn bộ giao diện |
| `js/main.js` | điều hướng `#/note/<id>` ⇄ thư viện, chặn phóng to trang, tạo ghi chú hướng dẫn lần đầu, đăng ký sw |
| `js/library.js` | thư viện: thanh bên, lưới thẻ, menu thẻ/thư mục, + Mới, nhập PDF/ảnh |
| `js/editor.js` | màn viết: trang, công cụ, cử chỉ, lịch sử, lưu, LIVE gửi đi |
| `js/ink.js` | VẼ dùng chung (iPad + màn NOTE AWord): giấy, nét có lực nhấn, dạ quang, chữ |
| `js/pages.js` | ảnh nền trang (blob ⇒ ImageBitmap), ảnh thu nhỏ, nhập PDF (pdf.js 6.2.108 chép từ myLesson) / ảnh |
| `js/db.js` | IndexedDB `mynote`: notes (thẻ nhẹ) · docs (nội dung) · folders · blobs (ảnh nền) |
| `js/live.js` | nút LIVE: chọn ống (Firestore thật / `?padsig=local`) + chữ trạng thái |
| `js/note-link.js` | ⚠️ CHÉP NGUYÊN VĂN sang AWord `core/note-link.js`: WebRTC + bắt tay Firestore + dự phòng `fb` + nhãn LIVE |
| `js/firebase.js` | Firebase aword-70dae: đăng nhập Google (chỉ tài khoản thầy), kênh `note_host`/`note_pad` |
| `js/settings.js` | hộp Cài đặt (bánh răng chân cột thư mục): giấy, ngón tay, tẩy, tự LIVE, tài khoản (sắp có), sao lưu .json |
| `js/ui.js` | menu nổi, hộp hỏi, xác nhận, toast, giữ-để-mở-menu |
| `sw.js` | mạng trước, rớt mạng dùng đệm; đổi code ⇒ tăng `VER` |

### Mô hình dữ liệu
- Trang rộng **1000 đơn vị**, cao `h` (A4 = 1414; PDF/ảnh theo tỉ lệ thật). Mọi toạ độ lưu theo đơn vị trang ⇒ độc lập cỡ màn/zoom.
- Nét: `{id, t:"pen"|"hl", c, w, pr, p:[x,y,lực,...]}` (làm tròn 0,1 đơn vị; nhấc bút thì chèn điểm để khoảng cách ≤ 3 — cho tẩy từng phần).
- Chữ: `{id, t:"text", x, y, s, c, text}` — tự xuống dòng tới lề phải (−40).
- Ghi chú: `notes/{id}` = `{title, folderId, fav, created, updated, pages, thumb(JPEG dataURL)}`; `docs/{id}` = `{pages:[{h, paper, img, strokes}]}`.

### Giao thức LIVE (đơn vị trang)
`doc` · `page` (nguyên trang) · `img` (ảnh nền 1 lần) · `s0`/`s+`/`s1` (nét đang viết, `s1` kèm nét chốt) · `laser` · `view` (khung iPad đang nhìn) · `beat`/`bye`;
máy chiếu trả `viewer` / `need`. Chi tiết đầu `js/live.js`.

## Khám phá kỹ thuật quan trọng
- ⭐ **Đường vẽ nét (v0.3.x)**: nét bút = ĐƯỜNG VIỀN tô một lần (`ink.js` `fillPen` → `fillVar`), làm mượt 2 tầng (lúc thu: streamline
  bút 0,45, điểm cách ≥ 0,9, lực 15 %/điểm; lúc vẽ: lọc 1-2-1 + trung bình 5 điểm lực). Nét đang viết + mọi nét tạm (tẩy, lasso, kéo) vẽ
  trên `.live-layer` CỠ KHUNG VIẾT (không bao giờ dùng canvas phủ cỡ trang). Dạ quang = hình ĐẶC trên canvas nháp rồi dán 36 % multiply
  (Safari tô nét dày trong suốt bị khuyết). ⛔ KHÔNG dùng `getPredictedEvents` (thầy: nét "dây ra rồi thu lại"; iPad từng làm hỏng vẽ dở).
- ⭐ **iOS**: chặn `touchstart/touchmove` (passive:false) + `contextmenu` + `selectstart` trên vùng viết — `touch-action:none` KHÔNG đủ
  (menu Sao chép/Dịch thuật, Scribble bắn pointercancel làm đứt nét). ⛔ Đừng lọc lòng bàn tay theo `width/height` — iOS báo NGÓN cũng
  ≈ 40–60 px. Chống tì tay = bút chạm trong 0,8 s sau khi "ngón" kéo trang ⇒ trả trang về chỗ cũ.
- ⭐ **Dải trên**: iOS làm mờ nội dung dưới thanh trạng thái tới ≈ 2 × chiều cao thanh (đo ảnh iPad 13": thanh 32 px, mờ tới 65 px) ⇒
  nội dung chạm được bắt đầu từ `2,1 × env(safe-area-inset-top)`.
- ⭐ **Tẩy**: hộp bao nhớ theo nét (`WeakMap`), vẽ lại đúng vùng (`renderRegion`). Bàn đo WebKit: Playwright `playwright-core@1.64.1` +
  `webkit-2370` (đã có trong `%LOCALAPPDATA%\ms-playwright`) — cài `playwright-core` vào thư mục tạm, mở `note-lab` cổng 9041, giả lập
  `PointerEvent` pointerType "pen". WebKit Windows ghép canvas bằng CPU ⇒ khung ~130 ms khi canvas trang đổi là chi phí MÔI TRƯỜNG.
- Chạm đúp Apple Pencil: Safari KHÔNG cho web nhận (chỉ app App Store có UIPencilInteraction) — muốn có phải đóng gói app iOS (cần Mac).
- **Ngón tay vs bút**: `touch-action:none` trên khung cuộn, app TỰ cuộn (1 ngón, có quán tính) + chụm phóng to (2 ngón, neo đúng điểm giữa 2 ngón theo toạ độ trang).
  Bút đang chạm ⇒ bỏ mọi ngón (chống tì tay). Nút bàn tay = cho ngón vẽ; khi đó ngón thứ 2 chạm trong 180 ms ⇒ huỷ nét, thành cử chỉ.
- **Canvas theo vùng nhìn**: chỉ trang trong ±0,75–1,75 màn có canvas; trang xa gỡ canvas (`width=0` để Safari nhả bộ nhớ ngay). Trần ~9 triệu điểm ảnh/trang.
- **Nét đang viết** vẽ dần trên canvas phủ (chỉ đoạn mới, đoạn i cần điểm i+1 nên trễ 1 điểm); dạ quang vẽ lại cả nét mỗi khung + `mix-blend-mode:multiply` để không đậm chồng.
- **Tẩy KHÔNG xoá chữ gõ** (như Notability) — xoá chữ bằng lasso hoặc chạm vào chữ để sửa/xoá hết.
- Khung xem Claude bị ẩn ⇒ rAF đứng ⇒ quán tính / pdf.js trông như treo khi thử. Nhập PDF thử bằng `_thu/ws.pdf` (gitignore).

## Roadmap
1. Thầy thử iPad thật (bút, cử chỉ, đăng nhập trong app cài, LIVE).
2. Đồng bộ notes/docs + ảnh nền (KHÔNG dùng `users/{uid}/items` — AWord readAll đọc cả kho đó) ⇒ đường + luật riêng, đọc HO SO BAO MAT trước.
5. Nâng cấp: nhận dạng hình (thẳng/tròn), chèn ảnh tự do, danh sách trang thu nhỏ, xuất PDF, thư mục con, ghi âm kèm ghi chú.

