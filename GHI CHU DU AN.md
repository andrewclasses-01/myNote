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

## Chặng 5 — 25/10/2026 — v0.3.1 Apple Pencil trên Safari + cử chỉ ngón (máy 1)

### Thầy thử v0.3.0 trên iPad, báo
1. "Trên Safari, vẽ cả một nét rồi nhấc bút Apple Pencil ra mới hiện nét (chưa nhấc thì vẫn trắng)."
2. "Nét vẽ không mượt, trông như bị run tay." 3. "Nét bút dạ quang bị đứt đoạn lung tung" (ảnh: vệt trắng lưỡi liềm dọc nét).
   Chrome máy tính + chuột thì rất ổn ⇒ nghi Apple Pencil. 4. Muốn "bấm đúp Apple Pencil để đổi tính năng như các note khác".

### Gốc + cách sửa
1. Code gọi `getPredictedEvents()` (CHỈ cho bút, chuột không đi nhánh này) TRƯỚC `drawLive()`. Trên iPad thật hàm này ném lỗi / trả toạ độ
   hỏng ⇒ lượt vẽ dở bị bỏ qua mỗi lần, còn điểm vẫn thu đủ ⇒ nhấc bút mới vẽ bản chốt. Sửa: VẼ TRƯỚC; đoán điểm sau trong `try`, chỉ
   nhận điểm hữu hạn và cách đầu bút < 30 đơn vị; gửi LIVE cũng trong `try`. Bỏ `desynchronized` (không đánh cược trên Safari).
   ⚠️ Chưa tái hiện được lỗi gốc ở máy (sự kiện giả không có điểm đoán) — sửa theo hướng phòng thủ, chờ thầy xác nhận trên iPad.
2. Pencil gửi điểm DÀY (tới 240 lần/giây), lực nhấn dao động liên tục ⇒ làm mượt mạnh hơn riêng cho bút: streamline 55 %, điểm lưu cách
   ≥ 0,9 đơn vị, lực nhấn đổi 15 %/điểm; lúc VẼ lọc thêm 1-2-1 vị trí + trung bình 5 điểm lực nhấn; dải độ dày theo lực hẹp lại
   (55–125 %, cũ 45–130 %). Áp cho cả nét cũ (chỉ đổi cách vẽ, dữ liệu giữ nguyên).
3. Safari tô nét DÀY + TRONG SUỐT qua nhiều đoạn cong ngắn bị khuyết ⇒ dạ quang vẽ hình nét ĐẶC 100 % (fillPen, đều nét) lên canvas nháp
   theo đúng độ phân giải ctx, rồi dán MỘT lần với 36 % multiply.
4. Safari KHÔNG cho trang web nhận chạm đúp Apple Pencil (chỉ app App Store có UIPencilInteraction) ⇒ thay bằng cử chỉ ngón như Notability:
   chạm đúp 1 ngón = đổi công cụ (Cài đặt ▸ "Chạm đúp bằng ngón tay": Bút ⇄ Tẩy (mặc định) / Công cụ trước / Tắt), chạm 2 ngón = hoàn
   tác, 3 ngón = làm lại; hiện chữ nhỏ giữa màn ("Tẩy", "Hoàn tác"…). Chỉ tính là chạm nếu < 300 ms, không ngón nào trượt > 12 px, và
   KHÔNG trong 600 ms quanh lúc bút đang dùng (tì tay lúc viết không hoàn tác nhầm). Đổi công cụ bằng tay cũng nhớ `prevTool`.
- AWord **Đợt 585**: chép `core/note-ink.js`.

### Đã kiểm
- **WebKit** (Playwright 1.64.1 + webkit-2370 đã có trên máy, cài `playwright-core` vào thư mục tạm — bàn thử `scratchpad/pw/thu-hl.js`
  của phiên này, không nằm trong kho): nét bút hiện NGAY lúc chưa nhấc (24.481 điểm ảnh trên lớp nét), cố tình thêm rung ±0,6 px + lực
  ngẫu nhiên vẫn mượt; dạ quang zíc zắc liền mạch, không vệt trắng.
- Chrome: chạm đúp đổi Bút ⇄ Tẩy ⇄ Bút; 2 ngón hoàn tác, 3 ngón làm lại; chạm 2 ngón ngay sau khi viết bị bỏ qua.
- CHƯA kiểm: iPad thật.

## Chặng 6 — 25/10/2026 — v0.3.2 nét bám đầu bút, dải trên theo số đo, tẩy hết lag, laser mới, cuộn/zoom ngón (máy 1)

### Thầy thử v0.3.1 trên iPad, báo
1. "Hiệu ứng vẽ trước làm nét bút cứ dây ra rồi thu lại … muốn vẽ đến đâu nét đến đó, nhấc bút ở đâu nét đúng đến đó."
2. "Phần viền trên vẫn bị mờ … hãy đo đạc chính bức ảnh chụp màn hình để điều chỉnh cho chuẩn."
3. "Tính năng tẩy (tất cả các kiểu) cực kỳ lag và delay, cần điều tra kỹ."
4. "Bút laser nét xấu — muốn tương tự nét bút viết thông thường, chỉ khác là có ánh sáng mềm tỏa ra như laser."
5. "Chưa dùng 2 ngón để zoom in/out được, chưa vuốt 1 ngón để di chuyển trong trang được."

### Gốc + cách sửa
1. BỎ HẲN điểm đoán trước (`getPredictedEvents`) — đuôi nét chỉ nối tới điểm THẬT cuối của bút; streamline bút 0,55 ⇒ 0,45.
2. **Đo ảnh chụp** (1479×1109, iPad 13", ≈ 1,08 px ảnh / px CSS): thanh trạng thái ≈ 32 px CSS; iOS làm mờ nội dung nằm dưới thanh và
   MỜ DẦN tới ≈ 65 px (≈ 2 × chiều cao thanh) — nửa trên nút Quay lại / ô tiêu đề (bắt đầu ở ≈ 46 px) bị mờ. Sửa: `--sat` =
   `env(safe-area-inset-top)`; dải công cụ cao `2,1 × sat + 66 px`, nội dung bắt đầu từ `2,1 × sat` (≈ 67 px); thư viện cũng vậy.
   Không có thanh trạng thái (sat = 0) thì không tốn chỗ.
3. **Tẩy** — đo bằng WebKit, trang 300 nét: bản cũ **143 ms mỗi lần di tẩy** (≈ 7 khung/giây). 3 gốc: (a) mỗi điểm tẩy tính lại hộp bao
   của MỌI nét bằng cách duyệt hết điểm; (b) vẽ lại CẢ TRANG mỗi khung; (c) vòng tẩy trên canvas phủ CỠ CẢ TRANG xoá trắng mỗi lần di.
   Sửa: hộp bao nhớ theo nét (`WeakMap`, nét không sửa tại chỗ); lọc nhanh "không nét nào chạm" ⇒ khỏi dựng mảng; vẽ lại ĐÚNG VÙNG bị đổi
   (`renderRegion` — clip, giấy + chỉ nét giao vùng; ảnh nền lấy đồng bộ `peekImg`); vòng tẩy trên `.live-layer`, chỉ xoá quanh vòng cũ.
   Sau sửa: phần mã ≤ 1 ms/lần di. ⚠️ WebKit headless trên Windows vẫn có khung ~130 ms khi canvas trang đổi — đã xác minh là chi phí ghép
   canvas trang lớn bằng CPU của môi trường thử (còn nguyên khi bỏ lệnh đo); iPad vẽ canvas bằng phần cứng. Nếu iPad vẫn chậm ⇒ chia trang
   thành nhiều DẢI canvas nhỏ (chỉ dải bị đổi phải ghép lại).
   Đồng thời BỎ HẲN canvas phủ cỡ trang: lasso + kéo vùng chọn cũng vẽ trên `.live-layer` (theo toạ độ trang qua `unitT()`).
4. **Laser**: `ink.js` tách `fillVar` (tô viền nét bán kính thay đổi — bút dùng chung) + `drawLaser`: nét mượt như bút (làm mượt 1-2-1, thu
   điểm streamline 0,4), đuôi nhỏ dần theo tuổi (`LASER_LIFE` 1,1 s), 2 lớp bóng mờ cùng màu (shadowBlur 2,2× và 0,8× độ toả). Mỗi lần đặt
   bút là một nét (`g`); tin LIVE kèm `g` + màu `c` ⇒ AWord Đợt 586 vẽ y hệt.
5. **Ngón tay**: v0.3.0 thêm lọc "vùng chạm > 44 px sau khi đã dùng bút = lòng bàn tay" — nhưng iOS báo vùng chạm của NGÓN thường cũng
   ≈ 40–60 px ⇒ dùng bút một lần là ngón tay bị coi là lòng bàn tay, không cuộn/zoom được. Bỏ lọc đó; chống tì tay mới: ghi vị trí trang
   lúc ngón đầu chạm (`gBegin`), nếu bút chạm trong 0,8 s sau đó (và chưa zoom) ⇒ trả trang về chỗ cũ + huỷ cử chỉ.

### Đã kiểm
- WebKit: laser lúc bút còn chạm — nét liền mượt, quầng sáng, đuôi nhỏ dần; tẩy 143 ms ⇒ mã ≤ 1 ms.
- Chrome (khung 1180×820): sau khi dùng bút, ngón 50 px cuộn được (527 px kèm quán tính), chụm zoom ×2, lòng bàn tay kéo trang rồi bút
  chạm ⇒ trang về chỗ cũ; tẩy từng phần; lasso chọn + kéo 60 px; lớp tạm sạch; không lỗi console.
- CHƯA kiểm: iPad thật.

## VIỆC ĐANG CHỜ
(Chốt phiên 25/10/2026 tối — thầy: "ghi hồ sơ và kết thúc phiên, tôi sẽ tiếp tục check và build sau". Bản live: myNote v0.3.2 `960d43d`,
AWord Đợt 586 `9583a83`.)
- [ ] ⭐ Thầy thử v0.3.2 trên iPad thật (đóng hẳn app rồi mở lại, Cài đặt phải ghi 0.3.2): nét bám đầu bút, dải trên hết mờ, tẩy có còn
  chậm không, laser mới, vuốt 1 ngón / chụm 2 ngón, chạm đúp / 2 ngón / 3 ngón. Chưa xác nhận trên iPad: lỗi "nhấc bút mới hiện nét"
  (sửa phòng thủ ở v0.3.1, chưa tái hiện được ở máy).
- [ ] Nếu tẩy (hoặc chốt nét) vẫn chậm trên iPad ⇒ chia mỗi trang thành nhiều DẢI canvas nhỏ (chỉ dải bị đổi phải ghép lại).
- [ ] Thử nút Xuất / Khôi phục sao lưu bằng file thật.
- [ ] Thử LIVE với iPad thật ⇄ máy chiếu AWord ▸ NOTE (đường thật mới thử bằng 2 tab Chrome cùng tài khoản); đăng nhập Google trong app
  cài từ Màn hình chính (popup có thể khó — kẹt thì đăng nhập trong Safari trước).
- [x] ~~Thầy thử mẫu trên iPad thật~~ (bấm `CHAY THU TREN IPAD.bat`, iPad cùng Wi-Fi mở địa chỉ nó in ra) — đã thay bằng bản live.
- [x] Kho GitHub + Pages + note.andrewclasses.com (25/10).
- [x] Firebase đăng nhập (25/10).
- [ ] Đồng bộ ghi chú giữa máy (Firestore + Storage, offline trước) — ⚠️ KHÔNG để trong `users/{uid}/items` (AWord readAll đọc cả kho đó mỗi lần mở thư viện) ⇒ cần đường riêng + luật mới, đọc HO SO BAO MAT trước.
- [x] LIVE thật WebRTC + Firestore (25/10).
- [x] Nút NOTE + màn chiếu trong AWord (Đợt 583).
- [ ] Nâng cấp: nhận dạng hình, chèn ảnh tự do, dải trang thu nhỏ, xuất PDF, thư mục con.
