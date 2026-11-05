#!/bin/bash
# ==============================================================================
# Script: deploy_server.sh
# Purpose:
#   Pull content branch, sync middle_sync into Typemill, clear cache,
#   set writable permissions, reload PHP-FPM/Nginx, and run test kit.
#
# Run as the normal SSH deploy user (NOT with sudo):
#   ./scripts/deploy_server.sh
#
# Required sudoers permissions are documented below in the response.
# ==============================================================================

set -Eeuo pipefail

# Print a useful error and stop instead of reporting a false deployment success.
trap 'rc=$?; echo "[ERROR] Deploy failed at line ${LINENO} (exit code: ${rc})."; exit "$rc"' ERR

# Nạp cấu hình biến môi trường từ config.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/config.sh"
cd "$BASE_DIR"

echo "=========================================================="
echo "[DEPLOY] BẮT ĐẦU QUÁ TRÌNH DEPLOY TRÊN SERVER..."
echo "Thư mục cài đặt: $BASE_DIR"
echo "=========================================================="

# 1. Update content branch from Git.
echo "-> 1. Cập nhật nhánh content từ Git remote..."
git config --global --add safe.directory "$BASE_DIR" 2>/dev/null || true
git config --global --add safe.directory "$BASE_DIR/content" 2>/dev/null || true

if [[ -d "$BASE_DIR/content/.git" || -f "$BASE_DIR/content/.git" ]]; then
    git -C "$BASE_DIR/content" config core.fileMode false 2>/dev/null || true
    # Dọn dẹp thay đổi tạm thời trên server để đảm bảo git pull --ff-only luôn thành công
    git -C "$BASE_DIR/content" checkout -- . 2>/dev/null || true
    git -C "$BASE_DIR/content" pull --ff-only origin content
else
    echo "[ERROR] $BASE_DIR/content không phải Git repository."
    echo "[ERROR] Không tự động fallback sang Git root để tránh pull nhầm repository."
    exit 1
fi

# 2. Sync middle_sync into Typemill directories.
MIDDLE_SYNC_DIR="$BASE_DIR/content/middle_sync"

if [[ -d "$MIDDLE_SYNC_DIR" ]]; then
    echo "-> 2. Đồng bộ dữ liệu từ $MIDDLE_SYNC_DIR..."

    if [[ -d "$MIDDLE_SYNC_DIR/media" ]]; then
        echo "   + Đồng bộ media/..."
        mkdir -p "$BASE_DIR/media"
        rsync -rlv --no-perms --no-owner --no-group --no-times \
            "$MIDDLE_SYNC_DIR/media/" "$BASE_DIR/media/"
    fi

    if [[ -d "$MIDDLE_SYNC_DIR/plugins" ]]; then
        echo "   + Đồng bộ plugins/..."
        mkdir -p "$BASE_DIR/plugins"
        rsync -rlv --no-perms --no-owner --no-group --no-times \
            "$MIDDLE_SYNC_DIR/plugins/" "$BASE_DIR/plugins/"
    fi

    # settings/ is intentionally managed separately on the server.
else
    echo "[WARN] Không tìm thấy $MIDDLE_SYNC_DIR; bỏ qua đồng bộ middle_sync."
fi

# 3. Clear navigation and Twig/template caches.
echo "-> 3. Xóa cache navigation và Twig cache cũ..."
mkdir -p "$BASE_DIR/data/navigation" "$BASE_DIR/cache"
find "$BASE_DIR/data/navigation" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
find "$BASE_DIR/cache" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +

# 4. Ensure writable directories exist and set permissions.
echo "-> 4. Kiểm tra thư mục ghi dữ liệu cho Web Server (www-data)..."
mkdir -p "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
         "$BASE_DIR/media" "$BASE_DIR/settings"

if id www-data >/dev/null 2>&1; then
    # This script runs as the deploy user. It can change ownership only where
    # that user has the required privilege. Do not silently ignore failures.
    if [[ "$(id -u)" -eq 0 ]]; then
        chown -R www-data:www-data \
            "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
            "$BASE_DIR/media" "$BASE_DIR/settings"
    else
        echo "[INFO] Không chạy deploy bằng root; bỏ qua chown."
        echo "[INFO] Đảm bảo các thư mục cần ghi đã được cấu hình owner/group phù hợp."
    fi
fi

# Áp dụng quyền 775 cho các thư mục ứng dụng (bỏ qua file do www-data sở hữu nếu chạy dưới quyền thường)
chmod -R 775 "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
             "$BASE_DIR/media" "$BASE_DIR/settings" 2>/dev/null || true

# 5. Validate and reload PHP-FPM 8.4 and Nginx using non-interactive sudo.
echo "-> 5. Kiểm tra và reload PHP-FPM 8.4 / Nginx..."

SYSTEMCTL="/usr/bin/systemctl"
NGINX="/usr/sbin/nginx"

if [[ ! -x "$SYSTEMCTL" ]]; then
    echo "[ERROR] Không tìm thấy $SYSTEMCTL."
    exit 1
fi

if [[ ! -x "$NGINX" ]]; then
    echo "[ERROR] Không tìm thấy $NGINX."
    exit 1
fi

# Check service state before attempting reload.
if ! "$SYSTEMCTL" is-active --quiet php8.4-fpm; then
    echo "[ERROR] php8.4-fpm chưa active. Không thể reload."
    exit 1
fi

if ! "$SYSTEMCTL" is-active --quiet nginx; then
    echo "[ERROR] nginx chưa active. Không thể reload."
    exit 1
fi

# Validate Nginx configuration before reloading either service.
echo "   + Kiểm tra cấu hình Nginx..."
if [[ "$(id -u)" -eq 0 ]]; then
    "$NGINX" -t
else
    sudo -n "$NGINX" -t
fi

# Reload PHP-FPM to refresh workers / OPcache when required.
echo "   + Reload PHP-FPM 8.4..."
if [[ "$(id -u)" -eq 0 ]]; then
    "$SYSTEMCTL" reload php8.4-fpm
else
    sudo -n "$SYSTEMCTL" reload php8.4-fpm
fi
"$SYSTEMCTL" is-active --quiet php8.4-fpm
echo "   [OK] PHP-FPM 8.4 đang active."

# Reload Nginx.
echo "   + Reload Nginx..."
if [[ "$(id -u)" -eq 0 ]]; then
    "$SYSTEMCTL" reload nginx
else
    sudo -n "$SYSTEMCTL" reload nginx
fi
"$SYSTEMCTL" is-active --quiet nginx
echo "   [OK] Nginx đang active."

echo "-> 5. Reload hoàn tất."

# 6. Rebuild search index if PHP is available
if [[ -f "$BASE_DIR/scripts/build_search_index.php" ]] && command -v php >/dev/null 2>&1; then
    echo "-> 6. Tái tạo Search Index cho toàn bộ bài viết..."
    php "$BASE_DIR/scripts/build_search_index.php" || echo "[WARN] Không thể tái tạo search index tự động."
fi

# 7. Run test kit. Keep the original non-blocking behavior.
if [[ -f "$BASE_DIR/scripts/test_stage.sh" ]]; then
    echo "-> 7. Đang chạy bộ Test Kit kiểm tra hệ thống..."
    if ! "$BASE_DIR/scripts/test_stage.sh"; then
        echo "[WARN] Test Kit có lỗi; deploy đã cập nhật và reload nhưng cần kiểm tra test."
    fi
fi

echo "=========================================================="
echo "[DEPLOY] DEPLOY HOÀN TẤT!"
echo "=========================================================="
