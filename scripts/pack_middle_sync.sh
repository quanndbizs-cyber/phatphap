#!/bin/bash
# ==============================================================================
# Script: pack_middle_sync.sh
# Mục đích: Đóng gói các tài nguyên dùng chung (media, plugins)
#          vào thư mục trung gian content/middle_sync để commit lên nhánh content.
# Lưu ý: Thư mục settings/ CHỨA THÔNG TIN NHẠY CẢM (mật khẩu, khóa bảo mật)
#        nên KHÔNG đóng gói vào đây mà được đồng bộ thủ công.
# ==============================================================================

set -e

# Nạp cấu hình biến môi trường từ config.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/config.sh"
cd "$BASE_DIR"

MIDDLE_SYNC_DIR="$BASE_DIR/content/middle_sync"

echo "=========================================================="
echo "📦 Đang chuẩn bị dữ liệu vào $MIDDLE_SYNC_DIR..."
echo "=========================================================="

mkdir -p "$MIDDLE_SYNC_DIR/media"
mkdir -p "$MIDDLE_SYNC_DIR/plugins"

# Đảm bảo không còn sót thư mục settings/ nhạy cảm trong middle_sync
rm -rf "$MIDDLE_SYNC_DIR/settings"

# 1. Đồng bộ media (bỏ qua media/tmp)
echo "-> 1. Đóng gói thư mục media..."
if [ -d "$BASE_DIR/media" ]; then
    rsync -rlv --no-perms --no-owner --no-group --no-times --exclude="tmp/*" "$BASE_DIR/media/" "$MIDDLE_SYNC_DIR/media/"
fi

# 2. Đồng bộ plugins tuỳ biến (ví dụ mediaplayer)
echo "-> 2. Đóng gói plugins đặc thù..."
if [ -d "$BASE_DIR/plugins/mediaplayer" ]; then
    mkdir -p "$MIDDLE_SYNC_DIR/plugins/mediaplayer"
    rsync -rlv --delete --no-perms --no-owner --no-group --no-times "$BASE_DIR/plugins/mediaplayer/" "$MIDDLE_SYNC_DIR/plugins/mediaplayer/"
fi

echo "=========================================================="
echo "✅ Đã đóng gói thành công vào content/middle_sync/ (Đã loại bỏ settings):"
ls -la "$MIDDLE_SYNC_DIR"
echo "=========================================================="
