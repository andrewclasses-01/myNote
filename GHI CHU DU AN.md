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

## VIỆC ĐANG CHỜ
- [ ] Thầy thử mẫu trên iPad thật (bấm `CHAY THU TREN IPAD.bat` trên máy tính, iPad cùng Wi-Fi mở địa chỉ nó in ra) và duyệt/góp ý.
- [ ] Tạo kho GitHub `andrewclasses-01/myNote` + GitHub Pages (cần thầy đồng ý trước khi đẩy).
- [ ] Firebase: đăng nhập + đồng bộ (Firestore + Storage, offline trước).
- [ ] LIVE thật iPad → máy chiếu: WebRTC + Firestore (khuôn rr-padlink.js).
- [ ] Nút NOTE + màn chiếu trong AWord thật.
- [ ] Nâng cấp: nhận dạng hình, chèn ảnh tự do, dải trang thu nhỏ, xuất PDF, thư mục con.
