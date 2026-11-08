#!/bin/bash
# ==============================================================================
# Script: pack_middle_sync.sh
# Mục đích: Đóng gói các tài nguyên dùng chung (media, settings.yaml)
#          vào thư mục trung gian content/middle_sync để commit lên nhánh content.
# Lưu ý: 
#   - KHÔNG copy plugins sang content vì plugins đã được commit vào main (v2.x).
#   - Chỉ đóng gói cấu hình chung settings/settings.yaml.
#   - KHÔNG đóng gói secrets.yaml hoặc thư mục người dùng settings/users/.
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
mkdir -p "$MIDDLE_SYNC_DIR/settings"

# 1. Đồng bộ cấu hình chung settings/settings.yaml (bảo vệ tuyệt đối secrets và users)
if [ -f "$BASE_DIR/settings/settings.yaml" ]; then
    echo "-> 1. Đóng gói cấu hình settings/settings.yaml..."
    cp -f "$BASE_DIR/settings/settings.yaml" "$MIDDLE_SYNC_DIR/settings/settings.yaml"
    # Đảm bảo không dính file nhạy cảm
    rm -f "$MIDDLE_SYNC_DIR/settings/secrets.yaml" "$MIDDLE_SYNC_DIR/settings/"*.pem 2>/dev/null || true
    rm -rf "$MIDDLE_SYNC_DIR/settings/users" 2>/dev/null || true
fi

# 2. Đồng bộ media (bỏ qua media/tmp)
echo "-> 2. Đóng gói thư mục media..."
if [ -d "$BASE_DIR/media" ]; then
    rsync -rlv --no-perms --no-owner --no-group --no-times --exclude="tmp/*" "$BASE_DIR/media/" "$MIDDLE_SYNC_DIR/media/"
fi

# 3. Loại bỏ thư mục plugins khỏi content/middle_sync/ (plugins đã được commit trực tiếp vào main repo)
if [ -d "$MIDDLE_SYNC_DIR/plugins" ]; then
    echo "-> 3. Loại bỏ plugins khỏi middle_sync/ (plugins được quản lý trực tiếp trong nhánh main v2.x)..."
    rm -rf "$MIDDLE_SYNC_DIR/plugins"
fi

echo "=========================================================="
echo "✅ Đã đóng gói thành công vào content/middle_sync/:"
ls -la "$MIDDLE_SYNC_DIR"
echo "=========================================================="
