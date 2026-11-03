# Thư Viện Kinh (2D)
- `js/` logic (lấy dữ liệu budsas.net, TTS, nhạc) — giữ nguyên khi làm 3D.
- `ui/ui2d.js` giao diện — viết `ui/ui3d.js` cùng hợp đồng (xem comment đầu file) rồi đổi 1 dòng import trong `js/main.js`.
- Chạy thử: `python server.py` rồi mở http://localhost:8000
- Deploy Render: New > Static Site, Publish Directory `.`; file `render.yaml` đã khai báo rewrite `/b/*` -> budsas.net
  (nếu tạo tay: Redirects/Rewrites > Add Rule: Source `/b/*`, Destination `https://budsas.net/*`, Action Rewrite).
- Nhạc: bỏ mp3 vào `music/`, sửa `music/list.json`: [{"name":"Tên","file":"music/abc.mp3"}]
