# Hướng Dẫn Cài Đặt Typemill trên WSL (Ubuntu) & Nginx + PHP 8.4

Tài liệu này tổng hợp toàn bộ quy trình cài đặt, cấu hình tối ưu và các kinh nghiệm thực tế (troubleshooting) khi triển khai Typemill trên môi trường WSL (Ubuntu), Nginx, PHP 8.4 và chạy dưới dạng subfolder (thư mục con, ví dụ: `/phatphap`).

---

## 1. Yêu cầu hệ thống & Cài đặt PHP Extension

Typemill là một Flat-file CMS xây dựng trên nền **Slim Framework**, sử dụng các thư viện Symfony, Twig và Parsedown. Để hoạt động trơn tru trên **PHP 8.4**, hệ thống bắt buộc phải có đầy đủ các extension sau:

```bash
sudo apt update
sudo apt install -y php8.4-cli php8.4-fpm php8.4-intl php8.4-mbstring \
                    php8.4-xml php8.4-curl php8.4-gd php8.4-zip php8.4-sqlite3
```

> [!IMPORTANT]
> **Lưu ý quan trọng về `php8.4-intl`:**
> Extension **`intl`** là bắt buộc. Nếu thiếu, khi Composer hoặc Symfony Console xử lý định dạng chuỗi Unicode sẽ gặp lỗi nghiêm trọng:
> `PHP Fatal error: Uncaught Error: Class "Normalizer" not found`

---

## 2. Cài đặt và Cấu hình Composer chuẩn cho PHP 8.4

Bản Composer 2.7.x mặc định trong kho `apt` của Ubuntu cũ hơn PHP 8.4, dễ phát sinh hàng loạt cảnh báo Deprecation Notice (`E_STRICT`, `implicitly marking parameter as nullable`).

### Các bước nâng cấp Composer lên bản mới nhất (2.8+ / 2.11+):
```bash
# 1. Gỡ bỏ bản Composer cũ từ apt (nếu có)
sudo apt remove -y composer

# 2. Xóa cache lệnh của bash
hash -r

# 3. Tải và cài đặt bản Composer mới nhất vào /usr/local/bin
curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer

# 4. Kiểm tra lại phiên bản
composer -V
```

---

## 3. Cài đặt Dependencies cho Typemill

Di chuyển vào thư mục dự án và chạy `composer update` (hoặc `composer install`):

```bash
cd /var/www/html/phatphap
composer update
```

Sau khi hoàn tất, thư mục `system/vendor/autoload.php` sẽ được tạo ra.
*(Nếu thiếu bước này, web sẽ báo lỗi Fatal Error: `Failed opening required '.../system/vendor/autoload.php'`)*.

---

## 4. Phân quyền thư mục (Permissions)

Typemill lưu trữ dữ liệu dạng flat-file, cần quyền ghi (write permission) vào các thư mục sau:
* `cache/`
* `content/`
* `data/`
* `media/`
* `settings/`

### Cấp quyền cho user web server (thường là `www-data`):
```bash
sudo chown -R www-data:www-data cache content data media settings
sudo chmod -R 775 cache content data media settings
```

*(Lưu ý: Nếu code nằm trên phân vùng Windows mount qua `/mnt/d/...`, đảm bảo quyền mount drvfs cho phép user `www-data` đọc/ghi bình thường).*

---

## 5. Cấu hình Nginx (Đặc biệt khi chạy Subfolder `/phatphap/`)

Mở file cấu hình Nginx (ví dụ `/etc/nginx/sites-available/default`):

```bash
sudo nano /etc/nginx/sites-available/default
```

### 5.1. Cấu hình URL Rewrite (Bắt buộc)
Khi chạy trong thư mục con `/phatphap/`, mọi request ảo (`/phatphap/tm/setup`, `/phatphap/tm/login`, các trang bài viết) phải được định tuyến về file `index.php` của chính thư mục đó:

```nginx
server {
    listen 80 default_server;
    root /var/www/html;
    index index.php index.html index.htm;

    # Cấu hình định tuyến cho Typemill subfolder
    location /phatphap/ {
        try_files $uri $uri/ /phatphap/index.php?$query_string;
    }

    # Bảo vệ dữ liệu nhạy cảm của Typemill, chặn truy cập trực tiếp qua URL
    location ~* ^/phatphap/(content|data|settings|cache)/.*$ {
        deny all;
        return 404;
    }

    # Xử lý PHP-FPM 8.4
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Chặn file database sqlite (nếu có)
    location ~ \.(db|sqlite|sqlite3|sql)$ {
        deny all;
        return 404;
    }
}
```

> [!WARNING]
> **Lỗi Nginx thường gặp:** Nếu đặt dòng `try_files` là `/index.php?$query_string` thay vì `/phatphap/index.php?$query_string`, Nginx sẽ tìm file `index.php` ở thư mục gốc `/var/www/html/` dẫn đến lỗi `404 Not Found`.

### 5.2. Kiểm tra và Khởi động lại Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Khởi động Quá trình Cài đặt Web (Setup Wizard)

Sau khi hoàn thành các bước trên, mở trình duyệt và truy cập:

```text
http://<IP-HOAC-DOMAIN>/phatphap/tm/setup
```

Tại đây bạn sẽ:
1. Tạo tài khoản quản trị (Admin username, password, email).
2. Lưu cấu hình và đăng nhập vào bảng điều khiển Typemill.
3. Bắt đầu tạo nội dung và xuất bản sách/tài liệu.


---

## 7. Quy trình Deploy 1-Click & Thư mục Trung Gian `content/middle_sync`

Để việc deploy các tài nguyên dùng chung (`media/`, plugin riêng `plugins/`) được trọn gói thông qua Git branch `content`, hệ thống sử dụng thư mục trung gian:

```text
content/middle_sync/
├── media/              # files/, live/, original/, thumbs/
└── plugins/            # mediaplayer/
```

> [!CAUTION]
> **Thư mục `settings/`:** Chứa thông tin nhạy cảm (mật khẩu SMTP, email cá nhân, khóa bảo mật `secrets.yaml`, `public_key.pem`, file user hash). Thư mục này **KHÔNG được đưa vào Git/middle_sync**, mà được quản lý và đồng bộ thủ công giữa local và server (qua SCP/SFTP) một lần duy nhất khi cài đặt hoặc khi đổi cấu hình quan trọng.

### 7.1. Phía Dev Localhost: 1-Click Đồng Bộ Vào `middle_sync` & Push Lên Git
Mỗi khi dev xong trên localhost (sửa bài viết, upload ảnh/audio, update plugin...), chỉ cần chạy **1 lệnh duy nhất**:

```bash
# Tự động đóng gói media & plugins vào middle_sync, commit và push lên GitHub nhánh 'content'
./scripts/sync_to_middle.sh

# Hoặc ghi commit message tùy chọn:
./scripts/sync_to_middle.sh -m "Cập nhật các bài viết mới và audio"
```
*(Trên Windows PowerShell, bạn có thể click/chạy: `.\scripts\sync_to_middle.ps1`)*

Script sẽ tự động:
1. Đóng gói tài nguyên (`media`, `plugins`) vào `content/middle_sync/`.
2. Kiểm tra thay đổi trong `content/` (bài viết `.md`, `.yaml`, ảnh, plugins...).
3. Tự động `git add`, `git commit` và `git push origin content` lên GitHub!

### 7.2. Cách Deploy trên Máy chủ (Deploy Server)
Trên máy chủ, chỉ cần chạy một lệnh duy nhất:
```bash
cd /var/www/html/phatphap && ./scripts/deploy_server.sh
```
Script sẽ tự động:
1. `git pull origin content` để nhận bài viết và thư mục trung gian `middle_sync/`.
2. Đồng bộ các file từ `content/middle_sync/` sang thư mục hệ thống tương ứng.
3. Tự động xóa sạch cache navigation cũ (`data/navigation/*`) để tránh lỗi dính link localhost.
4. Cấp quyền `www-data` cho các thư mục dữ liệu.
5. Reload Nginx & PHP-FPM.
6. Kích hoạt bộ Test Kit để xác thực hệ thống.

---

## 8. Bộ Test Kit Kiểm Tra Môi Trường Stage / Production

Chạy script test kit bất kỳ lúc nào để đánh giá tình trạng website:
```bash
# Kiểm tra tự động theo domain trong settings:
./scripts/test_stage.sh

# Hoặc chỉ định rõ URL cần test:
./scripts/test_stage.sh https://qts-home.duckdns.org/phatphap
./scripts/test_stage.sh http://172.23.75.180/phatphap
```

Bộ Test Kit sẽ tự động xác minh:
* ✅ **Mã phản hồi HTTP (200 OK)** cho tất cả các trang chính: trang chủ, Phật Giáo, Nhân Quả, Giáo Dục, Thông Báo, Trang Login.
* ✅ **Quét mã HTML**: Đảm bảo **100% không còn dính link `wsl_localhost`** hay IP máy local, các link navigation đã chuyển sang Relative URL (`/phatphap/...`).
* ✅ **Bảo mật**: Đảm bảo các thư mục nhạy cảm (`settings/`, `data/`, `content/`, `cache/`) bị Nginx chặn (403/404).
* ✅ **Quyền ghi (Filesystem)**: Đảm bảo các thư mục `cache/`, `content/`, `data/`, `media/`, `settings/` có quyền ghi.
