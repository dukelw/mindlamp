# Mind Lamp (Tâm Đăng)

Web tĩnh để tra cứu và học thuộc kinh, kệ. Hiện có Kinh Pháp Cú (bản dịch chùa Hoằng Pháp): 26 phẩm, 423 câu kệ.
Nguồn: `assets/Kinh Phap Cu - Chua Hoang Phap.pdf` (bản scan, chép lại thủ công từ ảnh trang).

## Chạy

Không cần build, chỉ cần một static server:

```bash
cd apps/mindlamp
python -m http.server 8080   # rồi mở http://localhost:8080
```

## Tính năng

- Danh sách 26 phẩm (số La Mã) và trang từng phẩm.
- Tìm theo số câu (`183`) hoặc từ khóa, không cần gõ dấu (`phong dat`).
- Chế độ học thuộc cho từng câu: Đọc / Chữ đầu / Ẩn hết, chạm từng dòng để hiện. Phím `←` `→` đổi câu, `Space` hiện dòng kế.
- Đánh dấu "đã thuộc" và xem tiến độ theo phẩm (lưu trong localStorage).
- "Ôn ngẫu nhiên" chọn một câu chưa thuộc.
- Sáng/tối, 3 cỡ chữ, dùng được trên điện thoại.

## Dữ liệu

`data.js` gồm `window.KINH_PHAP_CU = [{ id, name, verses: [{ n, l: [dòng...] }] }]`.
Chú thích cuối trang của bản gốc chưa đưa vào.
