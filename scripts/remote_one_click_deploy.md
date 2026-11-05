# Hướng Dẫn Sử Dụng Script remote_one_click_deploy.sh

Script `remote_one_click_deploy.sh` là công cụ tự động hóa triển khai 1-click từ máy Local lên Remote Production Server (`192.168.1.22`), hỗ trợ cả 2 chế độ:
1. **Chế độ Remote từ Local**: Tự động đóng gói `middle_sync/`, push Git (`content` & `v2.x`), và SSH lên máy chủ để kích hoạt triển khai.
2. **Chế độ Trực tiếp trên Server**: Cập nhật toàn bộ web root repository, sau đó cập nhật `content/`, đồng bộ tài nguyên, dọn cache, phân quyền và reload PHP-FPM/Nginx.

---

## 1. Cấu Trúc Triển Khai 2 Giai Đoạn Trên Server

Khi chạy trên Server (qua SSH hoặc trực tiếp qua `sudo ./scripts/remote_one_click_deploy.sh`), script tự động thực hiện:

### Giai đoạn 1: Web root
- Tự xác định thư mục web từ vị trí script (`BASE_DIR`).
- Kiểm tra tồn tại thư mục `content/`.
- Kiểm tra Web root có Git repository riêng (`.git`).
- Thiết lập `safe.directory` và tắt `core.fileMode` để tránh lỗi quyền hạn và diff giả.
- Dọn dẹp trạng thái tạm thời và chạy `git pull --ff-only` cập nhật toàn bộ Web root repository (nhánh `v2.x`).

### Giai đoạn 2: Content & Dịch vụ
- Gọi `scripts/deploy_server.sh`.
- Kéo nhánh `content` từ Git repository riêng (`origin content`).
- Đồng bộ tài nguyên từ `content/middle_sync/` (media, plugins) vào Typemill.
- Dọn sạch cache cũ (`data/navigation` và `cache`).
- Phân quyền thư mục dữ liệu cho Web Server (`www-data:www-data`, chmod `775`).
- Kiểm tra cấu hình và reload `php8.4-fpm` cùng `nginx`.
- Tự động tái tạo Search Index (`build_search_index.php`) và chạy bộ kiểm thử `test_stage.sh`.

---

## 2. Cách Chạy Script

### Cách A: Kích hoạt từ máy Local (Khuyến nghị)
Chỉ cần chạy 1 lệnh duy nhất tại máy làm việc (Local):
```bash
./scripts/remote_one_click_deploy.sh
```
*Script sẽ tự động dùng SSH key `~/.ssh/ssh_key/quannd_id_rsa` kết nối tới `quannd@192.168.1.22` và thực thi deploy.*

Nếu muốn bỏ qua bước commit & push tại local (khi đã push trước đó):
```bash
./scripts/remote_one_click_deploy.sh --skip-push
```

Tuỳ chỉnh thông tin kết nối SSH:
```bash
./scripts/remote_one_click_deploy.sh -i ~/.ssh/my_rsa --host=192.168.1.22 --user=quannd
```

### Cách B: Chạy trực tiếp trên Remote Server
Khi đăng nhập trực tiếp trên Server:
```bash
sudo ./scripts/remote_one_click_deploy.sh
```
*(hoặc `./scripts/remote_one_click_deploy.sh --server`)*

---

## 3. Cấu Hình Sudoers Trên Server (Để Chạy Không Cần Mật Khẩu)

Để script có thể chạy từ xa hoàn toàn tự động qua SSH mà không bị hỏi mật khẩu `sudo`, bạn có thể thêm quyền thực thi vào `/etc/sudoers.d/deploy-web` trên Server:

```bash
sudo visudo -f /etc/sudoers.d/deploy-web
```
Thêm dòng sau:
```
quannd ALL=(root) NOPASSWD: /var/www/html/phatphap/scripts/remote_one_click_deploy.sh
```
Kiểm tra cú pháp:
```bash
sudo visudo -c
```
