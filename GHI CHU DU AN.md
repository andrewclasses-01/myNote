# GHI CHÚ DỰ ÁN — myNote

## Chặng 1 — 25/10/2026 — v0.1.0 BẢN MẪU (máy 1)

### Bối cảnh / yêu cầu
Thầy gửi 2 ảnh Notability trên iPad (màn viết đáp án Flyers + thư viện "Ghi chú Chưa sắp xếp") và muốn:
1. App web chức năng tương tự Notability, chạy iPad ngang, viết vẽ, ghi chú, đồng bộ.
2. Viết vẽ truyền trực tiếp từ iPad (cùng Wi-Fi) lên AWord, giống cách iPad nối với các act AWord.
3. Cài được như app (PWA).

Thầy chốt (hỏi bằng nút):
- Tên **myNote**, code `E:\LAP TRINH APP\myNote`, kho riêng `andrewclasses-01/myNote` (chưa tạo).
- Phía AWord: **một nút NOTE mới hoàn toàn, thiết kế đẹp, nhiều tính năng (nâng cấp sau), đặt cùng chỗ với nút iPad, nút Showdown…** — không phải act, không vẽ đè act.
- Đồng bộ: **Firebase của AWord**.
- Cách làm: **mẫu giao diện trước**, duyệt xong mới nối Firebase + AWord.

### Đã làm
- Tìm hiểu cách AWord nối iPad: `pad.html` nghe `ipad_now`; WebRTC DataChannel bắt tay qua Firestore `users/{uid}/items`
  (rr-padlink.js: tài liệu host/pad mỗi bên 1 người ghi, sid + nonce, nudge 4 s × 8, dự phòng qua kho); màn chỉ-xem (run-link.js) đi Firestore một chiều.
  Thanh nút AWord: `main.js` ~dòng 3225 — Showdown (vàng) · Stats · iPad · Settings · tài khoản; nút `.aw-appbtn` 46×46 bo 13.
- Dựng app ES module thuần (không build): thư viện, màn viết, nhập PDF/ảnh, PWA, kênh LIVE, bản mẫu `aword-note.html`. Chi tiết file: CLAUDE.md.
- Màn viết: bút có lực nhấn (3 cỡ, 5 màu + màu tự chọn), dạ quang, tẩy (cả nét / từng phần), lasso (kéo, xoá, tô màu, nhân bản), gõ chữ,
  laser mờ dần; ngón tay cuộn + chụm phóng 60–300 %; hoàn tác 200 bước; thêm/xoá trang; 4 kiểu giấy; lưu trang thành PNG; tự lưu sau 0,8 s.
- Bản mẫu AWord: thanh nút giả + nút NOTE gradient cam-hồng (chấm LIVE khi iPad phát) + màn chiếu nền tối 3 chế độ: Theo iPad / Cả trang / Vừa ngang,
  camera trượt mềm, laser mờ dần, màn chờ hướng dẫn 3 bước.
- Icon app vẽ bằng PIL (trang giấy trắng + nét bút xanh trên nền cam-hồng); `CHAY THU TREN IPAD.bat` (CRLF) để thầy tự mở máy chủ thử.

### Quyết định kỹ thuật
- Toạ độ trang 1000 đơn vị — LIVE gửi toạ độ đơn vị nên máy chiếu vẽ lại bằng vector, nét luôn sắc ở mọi độ phóng.
- `ink.js` dùng chung cho iPad và màn NOTE ⇒ hai bên vẽ y hệt.
- Thẻ ghi chú (nhẹ) tách khỏi nội dung (nặng) ⇒ thư viện 1000+ ghi chú vẫn mở nhanh.
- Tẩy không xoá chữ gõ (giống Notability).

### Lỗi đã gặp / cách gỡ
- Lần thử đầu: tẩy từng phần quét qua khối chữ hướng dẫn ⇒ mất cả khối ⇒ sửa: tẩy bỏ qua chữ gõ.
- Máy tính hiện thanh cuộn ngang thừa ở màn viết ⇒ ẩn thanh cuộn khung viết (đã có nút chuyển trang).
- Thử nhập PDF trông như treo — do khung xem bị ẩn (rAF đứng + 2 lượt nhập chồng). Thử từng bước: pdf.js 6.2.108 đọc/vẽ bình thường, nhập xong 2 trang.

### Đã kiểm (máy tính, khung 1180×820)
Thư viện + ảnh thu nhỏ · bút lực nhấn · dạ quang · tẩy từng phần · lasso kéo · gõ chữ · cuộn 1 ngón · chụm ×2 (canvas vẽ lại đúng cỡ) ·
nhập PDF 2 trang · LIVE sang tab `aword-note.html` (nét, chế độ Theo iPad, chấm LIVE trên nút) · không lỗi console.
CHƯA kiểm trên iPad thật (Apple Pencil, quán tính cuộn, Safari).

## Chặng 2 — 25/10/2026 — v0.1.1 sửa mẫu thư viện (máy 1)

### Yêu cầu của thầy
1. Bỏ các phần Tất cả ghi chú, Sử dụng gần đây, Chưa phân loại.
2. Cột thư mục: bấm chọn mục nào mới hiện số mục bên trong, không hiện sẵn.
3. Nút "Màn NOTE AWord" chỉ dùng icon.
4. Thêm nút cài đặt vào cột thư mục để thiết lập những cái cần thiết.

### Đã làm
- `library.js`: bỏ hẳn hàng tab (cả tab Yêu thích — đã có mục Yêu thích ở thanh bên) và bộ lọc `view.tab`; tiêu đề trang đứng một mình.
- Số đếm chỉ vẽ ở mục ĐANG CHỌN (Ghi chú / Yêu thích / từng thư mục); Trang chủ không có số.
- Nút AWord thành nút tròn chỉ icon (cast), tên đầy đủ nằm ở `title` + `aria-label`.
- Bánh răng ở chân cột thư mục (cạnh dòng "Bản mẫu · lưu trong máy này") ⇒ `js/settings.js` (mới):
  Giấy mặc định · Ngón tay vẽ · Kiểu tẩy (ghi thẳng khoá `mynote.paper` / `mynote.tools` mà màn viết đọc) ·
  Tự bật LIVE khi mở ghi chú (`mynote.autolive`, `editor.js` đọc lúc mở) · Tài khoản Google (nút "Sắp có") ·
  Sao lưu: Xuất toàn bộ ra 1 file .json (ảnh nền nhúng dataURL) / Khôi phục (thêm-ghi đè theo mã) + dung lượng đang dùng · phiên bản.
- `sw.js` VER 0.1.1 + thêm settings.js vào bộ đệm.

### Lỗi đã gặp / cách gỡ
- Tên thư mục bị căn giữa: luật `.nav-it span { flex:1 }` cũng kéo giãn ô icon `.fic` ⇒ `.nav-it .fic { flex:none }`.
- Icon thư mục đang chọn bị luật `.nav-it.on .ic` tô hồng mất màu thư mục ⇒ `.nav-it.folder.on .ic { color: inherit }`.

### Đã kiểm (máy tính 1180×820)
Không còn hàng tab; chỉ thư mục đang chọn có số; nút icon AWord; hộp Cài đặt mở, các nút ghi đúng localStorage (đã trả lại giá trị cũ sau khi thử).
Chưa thử Xuất/Khôi phục bằng file thật; chưa thử trên iPad.

## Chặng 3 — 25/10/2026 — v0.2.0 LIVE THẬT + note.andrewclasses.com + nút NOTE trong AWord (máy 1)

### Yêu cầu của thầy
"Hãy đưa luôn vào AWord đi. Còn app trên ipad thì gắn vào link note.andrewclasses.com. Tôi đã đăng nhập ở chrome."
Thầy cho phép (hỏi bằng nút): tạo kho GitHub công khai · CNAME ở inet · thêm tên miền vào Firebase · đẩy AWord live.

### Đã làm
- `js/note-link.js` (MỚI, dùng chung, KHÔNG import gì — chép NGUYÊN VĂN sang AWord `core/note-link.js`): WebRTC DataChannel nối thẳng,
  bắt tay qua Firestore `users/{uid}/items` — `note_host` (máy chiếu ghi) / `note_pad` (iPad ghi), khuôn AWord `rr-padlink.js`
  (sid + nonce, nudge `hc` 4 s × 8, cắt khúc tin 12 KB). Đường dự phòng `fb` (bản trang ≤ 1 lần/0,7 s, ≤ 800 KB, không ảnh nền).
  `watchPadLive` cho nhãn LIVE trên nút NOTE (nhịp `b` 15 s, phải ĐỔI trong 40 s). `localSignal` = bàn thử 2 tab (`?padsig=local`).
- `js/firebase.js` (MỚI): cùng dự án aword-70dae, đăng nhập Google popup (chỉ namdaptrai01@gmail.com), KHÔNG setPersistence;
  nạp sẵn lúc mở app để popup mở ngay trong cú bấm (Safari chặn popup trễ). Kind `note-link`.
- `js/live.js` viết lại: dùng `createNotePad`; trạng thái nút LIVE: chờ màn NOTE / đang nối… / AWord đang xem / đường chậm.
- `editor.js`: bấm LIVE khi chưa đăng nhập ⇒ hỏi đăng nhập; tự bật LIVE (Cài đặt) đợi biết phiên; `pagehide` ⇒ tắt LIVE (khỏi kẹt máy chiếu).
- Chân cột thư mục: nút tài khoản (ảnh + "Đã nối tài khoản AWord" / "Đăng nhập Google để LIVE"); Cài đặt: Đăng nhập/Đăng xuất thật,
  thêm dòng "Đồng bộ ghi chú — Sắp có". Nút icon AWord mở `https://aword.andrewclasses.com/?note=1`. Gỡ `aword-note.html` (đã vào AWord thật).
- AWord **Đợt 583** `9b05a13` LIVE (build.json sha khớp): nút NOTE trước nút iPad + `core/note-screen.js` (chữ tiếng Anh như AWord).
- Kho **andrewclasses-01/myNote** (công khai) + Pages nhánh main + `CNAME` · bản ghi CNAME `note → andrewclasses-01.github.io` ở
  portal.inet.vn (bảo vệ Tắt như các bản ghi GitHub khác) · Firebase ▸ Authentication ▸ Authorized domains thêm `note.andrewclasses.com`
  · chứng chỉ HTTPS cấp sau ~10 phút ⇒ đã bật Enforce HTTPS.

### Đã kiểm
- Bàn thử 2 tab cùng origin (máy chủ `note-lab` cổng 9041 phục vụ cả `E:\LAP TRINH APP`): nối < 1 s, nét hiện ngay, tắt/bật lại,
  3 vòng tải lại/đóng-mở máy chiếu đều nối lại.
- **Đường THẬT** trên Chrome của thầy: AWord live bấm NOTE ⇒ ghi `note_host` được (luật cho qua); tab thứ 2 đóng vai iPad
  (cùng tài khoản) ⇒ bắt tay Firestore + WebRTC nối 1,2 s, chữ + nét hiện trên màn NOTE; tắt WebRTC giả Wi-Fi chặn ⇒ "slow link" vẫn hiện trang.
- note.andrewclasses.com mở được qua https, service worker chạy.
- CHƯA kiểm: đăng nhập Google trên iPad thật (popup trong app cài từ Màn hình chính có thể khó — nếu kẹt thì đăng nhập trong Safari trước).

### Lỗi đã gặp / cách gỡ
- AWord: TDZ `let raf` khai sau `host.start()` ⇒ ReferenceError — khai cùng `cam` phía trên.
- So băm file AWord live luôn "lệch" vì live là bản THU GỌN (Đợt 482) — kiểm bằng `build.json` (sha + nguon), không so byte.
- `tools/kiem-live.py` của AWord bị timeout mạng lần này ⇒ kiểm tay bằng build.json.

## Chặng 4 — 25/10/2026 — v0.3.0 VIẾT MƯỢT trên iPad (máy 1)

### Thầy thử iPad thật, báo 3 lỗi
1. "Khi đè tay lên viết, nét bút bị dừng và có menu của trình duyệt hiện lên (Sao chép | Dịch thuật) — cần chặn hoàn toàn."
2. "Viền trên cùng bị mờ do nằm sát khu vực thanh trạng thái của iOS."
3. "Nét bút không mượt, bị giật. Cần cực kỳ tối ưu … mượt, đẹp, tối ưu y như Notability."

### Gốc + cách sửa
1. **Menu iOS / nét đứt**: iOS vẫn chạy hành vi gốc của CHẠM (giữ lâu ⇒ bôi chọn chữ + menu, kính lúp, Scribble của Pencil) — chính
   các hành vi đó bắn `pointercancel` làm nét dừng. `touch-action:none` KHÔNG đủ trên iOS. Sửa: `touchstart`/`touchmove` trên khung viết
   `preventDefault` (passive:false, trừ menu vùng chọn / ô gõ chữ / nút thêm trang) + chặn `contextmenu` + `selectstart` toàn trang
   (trừ input/textarea) + CSS `user-select:none; -webkit-touch-callout:none` cho cả app. Bút chạm ⇒ bỏ focus ô tiêu đề.
   **Chống tì lòng bàn tay**: đã dùng bút một lần trong phiên ⇒ chạm có vùng tiếp xúc > 44 px bị bỏ qua; bút chạm ⇒ huỷ cử chỉ
   ngón/lòng tay đang dở (hết cảnh tì tay trước rồi đặt bút làm trang trôi).
2. **Viền trên mờ**: trang giấy cuộn LÊN DƯỚI thanh trạng thái (viewport-fit=cover) và iOS làm mờ phần nội dung dưới thanh đó.
   Sửa: dải công cụ thành DẢI ĐẶC cao `env(safe-area-inset-top) + 72px` (biến `--edtop`), khung viết bắt đầu ngay dưới dải ⇒
   không gì cuộn dưới thanh trạng thái. `theme-color` = màu dải (#eef1f6).
3. **Giật** — 5 nguyên nhân, sửa cả 5:
   - Lớp nét đang viết là canvas CỠ CẢ TRANG (~7 triệu điểm ảnh ở ×2) ⇒ iPad xoá + ghép lớp khổng lồ mỗi khung ⇒ nay `.live-layer`
     CỠ KHUNG VIẾT, vẽ theo toạ độ trang qua `setTransform`, chỉ xoá vùng quanh nét (`lvBox`), `desynchronized`.
   - Nét vẽ bằng hàng trăm `stroke()` đầu tròn chồng nhau ⇒ mép gợn + nặng ⇒ `ink.js` `fillPen`: dựng ĐƯỜNG VIỀN cả nét (lệch theo
     pháp tuyến, bán kính theo lực nhấn), nối `quadraticCurveTo` qua trung điểm, tô MỘT lần (nonzero ⇒ vòng chữ o / nét tự cắt vẫn đặc),
     chấm tròn ở 2 đầu + góc gắt. Đo trên máy: 1 khung nét 1.500 điểm ≈ 2,5 ms (đã ép vẽ xong bằng getImageData).
   - Tay run / cảm biến nhiễu ⇒ răng cưa ⇒ làm mượt lúc thu điểm (streamline 40 % bút, lực nhấn đổi dần 35 %/điểm); lúc vẽ nối thêm
     điểm THẬT cuối (+ điểm đoán `getPredictedEvents` nếu trình duyệt có) ⇒ mực bám đầu bút; nhấc bút ⇒ chốt đúng điểm thật.
   - `backdrop-filter: blur` ở tiêu đề/thanh công cụ/nút trang ⇒ iPad tính lại blur mỗi khung khi mực đổi bên dưới ⇒ bỏ, nền trắng đặc.
   - Lưu (chép cả ghi chú vào IndexedDB + dựng ảnh thu nhỏ JPEG) 0,8 s sau MỖI nét = đúng lúc đang viết nét kế ⇒ nay chờ 1,5 s và
     KHÔNG lưu khi bút đang chạm / vừa nhấc < 1,2 s; ảnh thu nhỏ chỉ dựng lúc rời màn hoặc ẩn app.
   - Thêm: đang viết không đo lại khung trang mỗi lần di bút (`getBoundingClientRect` chỉ lúc đặt bút); canvas trang `alpha:false`.
- AWord **Đợt 584**: chép `core/note-ink.js` ⇒ máy chiếu vẽ nét y hệt iPad.

### Đã kiểm (máy tính 1180×820)
Vòng xoắn có lực nhấn đổi liên tục, chữ V gắt, vòng tự cắt — mép mịn, đầu tròn; dạ quang, lasso, gõ chữ vẫn đúng; lớp nét sạch sau khi
nhấc bút; không lỗi console. CHƯA kiểm được trên iPad thật: cảm giác mượt, menu iOS, chống tì tay, dải trên — chờ thầy thử.

## VIỆC ĐANG CHỜ
- [ ] Thử nút Xuất / Khôi phục sao lưu bằng file thật.
- [ ] Thầy thử iPad thật: note.andrewclasses.com ▸ Thêm vào MH chính ▸ đăng nhập ▸ ghi chú ▸ LIVE; máy chiếu AWord ▸ NOTE.
- [x] ~~Thầy thử mẫu trên iPad thật~~ (thay bằng dòng trên) (bấm `CHAY THU TREN IPAD.bat` trên máy tính, iPad cùng Wi-Fi mở địa chỉ nó in ra) và duyệt/góp ý.
- [x] Kho GitHub + Pages + note.andrewclasses.com (25/10).
- [x] Firebase đăng nhập (25/10).
- [ ] Đồng bộ ghi chú giữa máy (Firestore + Storage, offline trước) — ⚠️ KHÔNG để trong `users/{uid}/items` (AWord readAll đọc cả kho đó mỗi lần mở thư viện) ⇒ cần đường riêng + luật mới, đọc HO SO BAO MAT trước.
- [x] LIVE thật WebRTC + Firestore (25/10).
- [x] Nút NOTE + màn chiếu trong AWord (Đợt 583).
- [ ] Nâng cấp: nhận dạng hình, chèn ảnh tự do, dải trang thu nhỏ, xuất PDF, thư mục con.
