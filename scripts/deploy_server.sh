#!/bin/bash
# ==============================================================================
# Script: deploy_server.sh
# Mục đích: Chạy trên Deploy Server để pull nhánh content mới nhất,
#          đồng bộ từ thư mục trung gian content/middle_sync/ sang các thư mục
#          chính của Typemill (settings, media, plugins), xóa cache và phân quyền.
# Sử dụng:
#   ./scripts/deploy_server.sh
# ==============================================================================

set -e

# Xác định thư mục gốc của Typemill
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

echo "=========================================================="
echo "🚀 [DEPLOY] BẮT ĐẦU QUÁ TRÌNH DEPLOY TRÊN SERVER..."
echo "Thư mục cài đặt: $BASE_DIR"
echo "=========================================================="

# 1. Cập nhật nhánh content từ Git
echo "-> 1. Cập nhật nhánh content từ Git remote..."
if [ -d "$BASE_DIR/content/.git" ] || [ -f "$BASE_DIR/content/.git" ]; then
    git -C "$BASE_DIR/content" pull origin content
else
    echo "   [!] Cảnh báo: content không phải thư mục git trực tiếp, kiểm tra git root..."
    git pull origin content 2>/dev/null || true
fi

# 2. Đồng bộ từ thư mục trung gian middle_sync sang Typemill gốc
MIDDLE_SYNC_DIR="$BASE_DIR/content/middle_sync"

if [ -d "$MIDDLE_SYNC_DIR" ]; then
    echo "-> 2. Đồng bộ dữ liệu từ $MIDDLE_SYNC_DIR sang các thư mục hệ thống..."
    
    # 2.1 Media (Đồng bộ thư viện ảnh/audio)
    if [ -d "$MIDDLE_SYNC_DIR/media" ]; then
        echo "   + Đồng bộ media/..."
        mkdir -p "$BASE_DIR/media"
        rsync -rlv --no-perms --no-owner --no-group --no-times "$MIDDLE_SYNC_DIR/media/" "$BASE_DIR/media/"
    fi

    # 2.2 Plugins (Đồng bộ plugin đặc thù như mediaplayer)
    if [ -d "$MIDDLE_SYNC_DIR/plugins" ]; then
        echo "   + Đồng bộ plugins/..."
        mkdir -p "$BASE_DIR/plugins"
        rsync -rlv --no-perms --no-owner --no-group --no-times "$MIDDLE_SYNC_DIR/plugins/" "$BASE_DIR/plugins/"
    fi
    # Lưu ý: Thư mục settings/ được quản lý và cấu hình riêng trên server, không bị ghi đè.
else
    echo "   [!] Không tìm thấy thư mục $MIDDLE_SYNC_DIR, bỏ qua bước đồng bộ trung gian."
fi

# 3. Xoá cache navigation và template cache để rebuild sạch
echo "-> 3. Xóa cache navigation và Twig cache cũ..."
rm -rf "$BASE_DIR/data/navigation"/* 2>/dev/null || true
rm -rf "$BASE_DIR/cache"/* 2>/dev/null || true

# 4. Phân quyền thư mục ghi dữ liệu cho Web Server (www-data)
echo "-> 4. Phân quyền cho www-data..."
mkdir -p "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" "$BASE_DIR/media" "$BASE_DIR/settings"
if id "www-data" >/dev/null 2>&1; then
    chown -R www-data:www-data "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" "$BASE_DIR/media" "$BASE_DIR/settings" 2>/dev/null || true
fi
chmod -R 775 "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" "$BASE_DIR/media" "$BASE_DIR/settings" 2>/dev/null || true

# 5. Reload Nginx / PHP-FPM nếu có quyền sudo/systemctl
echo "-> 5. Reload Web Server..."
if command -v systemctl >/dev/null 2>&1; then
    systemctl reload php8.4-fpm 2>/dev/null || true
    systemctl reload nginx 2>/dev/null || true
fi

echo "=========================================================="
echo "🎉 DEPLOY HOÀN TẤT!"
echo "=========================================================="

# 6. Tự động chạy test kit kiểm tra môi trường
if [ -f "$BASE_DIR/scripts/test_stage.sh" ]; then
    echo "-> 6. Đang chạy bộ Test Kit kiểm tra hệ thống..."
    "$BASE_DIR/scripts/test_stage.sh" || true
fi
