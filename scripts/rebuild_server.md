# Hướng Dẫn Rebuild Nhanh Server (Apply Updates & Clear Cache)

Khi bạn chỉ cần `git pull` cập nhật dữ liệu (`content/` hoặc mã nguồn) mà web chưa thấy thay đổi ngay (do Typemill cache navigation và template Twig), hãy sử dụng script:

## 1. Lệnh chạy nhanh:

```bash
# Đứng tại bất kỳ thư mục nào trong dự án:
./scripts/rebuild_server.sh
```

Hoặc nếu muốn vừa pull vừa rebuild trong 1 lệnh duy nhất:

```bash
./scripts/rebuild_server.sh --pull
```

## 2. Những gì script thực hiện tự động:
1. **Pull Git (nếu dùng `--pull`)**: Cập nhật cả repo chính và submodule/branch `content`.
2. **Đồng bộ `middle_sync/`**: Sync plugins và media vào hệ thống nếu có cập nhật mới.
3. **Xóa Cache Navigation (`data/navigation/*`)**: Ép Typemill quét lại toàn bộ cây thư mục bài viết mới nhất.
4. **Xóa Cache Twig (`cache/*`)**: Làm mới hoàn toàn cache giao diện, template và style.
5. **Thiết lập quyền ghi (775 / www-data)**: Đảm bảo web server Nginx/PHP có quyền ghi file cache mới.
6. **Reload PHP-FPM & Nginx**: Tự động phát hiện phiên bản PHP-FPM đang chạy (`php8.4-fpm`, ...) và reload để làm mới OPcache.
7. **Warm-up Navigation tức thời**: Gửi HTTP request nội bộ để Typemill tái tạo ngay file navigation mà không cần chờ người dùng F5.
