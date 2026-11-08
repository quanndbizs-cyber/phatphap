# Hướng dẫn cấu hình Sudoers & Chạy deploy_server.sh trên Server

## 1. Cấu hình Sudoers cho deploy user (không cần nhập mật khẩu sudo khi reload service)
Chạy:
```bash
sudo visudo -f /etc/sudoers.d/deploy-web
```

Thêm nội dung sau (thay `quannd` bằng user SSH thực tế nếu khác):
```sudoers
quannd ALL=(root) NOPASSWD: /usr/sbin/nginx -t
quannd ALL=(root) NOPASSWD: /usr/bin/systemctl reload php8.4-fpm
quannd ALL=(root) NOPASSWD: /usr/bin/systemctl reload nginx
```

Phân quyền bảo mật cho file sudoers và kiểm tra cú pháp:
```bash
sudo chmod 440 /etc/sudoers.d/deploy-web
sudo visudo -c
```

## 2. Cấu hình an toàn Git (tránh lỗi dubious ownership khi chạy dưới sudo hoặc deploy user)
```bash
git config --global --add safe.directory /var/www/html/phatphap
git config --global --add safe.directory /var/www/html/phatphap/content
```

## 3. Chạy Deploy trên Server
Script sẽ tự động:
1. Lưu lại commit ban đầu của cả Web root (`v2.x`) và `content/`.
2. Kéo cập nhật nhánh chính Web root `v2.x` bằng `git pull --rebase --autostash origin v2.x`.
3. Kéo cập nhật nhánh bài viết `content` bằng `git pull --rebase --autostash origin content`.
4. Đồng bộ `middle_sync/` (media, settings.yaml) và **KHÔNG copy plugins**.
5. Kiểm tra cú pháp PHP (`php -l`) và cấu hình Nginx (`nginx -t`).
6. Xóa cache và reload `php8.4-fpm` cùng `nginx`.
7. Chạy bộ Test Kit (`test_stage.sh`). Nếu có bất kỳ bài test nào thất bại, hệ thống tự động **Rollback** về commit trước khi deploy để giữ hệ thống hoạt động ổn định.
8. Thống kê và in báo cáo chi tiết các commit mới và file thay đổi sau khi hoàn tất.

```bash
cd /var/www/html/phatphap
./scripts/deploy_server.sh

# Chế độ cưỡng bức reset hard:
./scripts/deploy_server.sh --force

# Bỏ qua Test Kit nếu cần:
./scripts/deploy_server.sh --skip-test
```
