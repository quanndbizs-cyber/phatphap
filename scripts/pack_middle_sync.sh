#!/bin/bash
# ==============================================================================
# Script: pack_middle_sync.sh
# Mục đích: Đóng gói các dữ liệu đặc thù (settings, media, plugins)
#          vào thư mục trung gian content/middle_sync để commit lên nhánh content.
# Sử dụng:
#   ./scripts/pack_middle_sync.sh          (dùng settings.yaml hiện tại)
#   ./scripts/pack_middle_sync.sh --prod   (dùng settings.yaml.production nếu có)
# ==============================================================================

set -e

# Xác định thư mục gốc của Typemill
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

MIDDLE_SYNC_DIR="$BASE_DIR/content/middle_sync"

echo "=========================================================="
echo "📦 Đang chuẩn bị dữ liệu vào $MIDDLE_SYNC_DIR..."
echo "=========================================================="

mkdir -p "$MIDDLE_SYNC_DIR/settings/users"
mkdir -p "$MIDDLE_SYNC_DIR/media"
mkdir -p "$MIDDLE_SYNC_DIR/plugins"

# 1. Đồng bộ settings
echo "-> 1. Đóng gói thư mục settings..."
if [ "$1" == "--prod" ] && [ -f "$BASE_DIR/settings/settings.yaml.production" ]; then
    echo "   [!] Sử dụng cấu hình settings.yaml.production cho Production/Stage"
    cp "$BASE_DIR/settings/settings.yaml.production" "$MIDDLE_SYNC_DIR/settings/settings.yaml"
else
    if [ -f "$BASE_DIR/settings/settings.yaml" ]; then
        cp "$BASE_DIR/settings/settings.yaml" "$MIDDLE_SYNC_DIR/settings/settings.yaml"
    fi
fi

[ -f "$BASE_DIR/settings/secrets.yaml" ] && cp "$BASE_DIR/settings/secrets.yaml" "$MIDDLE_SYNC_DIR/settings/secrets.yaml"
[ -f "$BASE_DIR/settings/public_key.pem" ] && cp "$BASE_DIR/settings/public_key.pem" "$MIDDLE_SYNC_DIR/settings/public_key.pem"

if [ -d "$BASE_DIR/settings/users" ]; then
    rsync -av --delete "$BASE_DIR/settings/users/" "$MIDDLE_SYNC_DIR/settings/users/"
fi

# 2. Đồng bộ media (bỏ qua media/tmp)
echo "-> 2. Đóng gói thư mục media..."
if [ -d "$BASE_DIR/media" ]; then
    rsync -av --exclude="tmp/*" "$BASE_DIR/media/" "$MIDDLE_SYNC_DIR/media/"
fi

# 3. Đồng bộ plugins tuỳ biến (ví dụ mediaplayer)
echo "-> 3. Đóng gói plugins đặc thù..."
if [ -d "$BASE_DIR/plugins/mediaplayer" ]; then
    mkdir -p "$MIDDLE_SYNC_DIR/plugins/mediaplayer"
    rsync -av --delete "$BASE_DIR/plugins/mediaplayer/" "$MIDDLE_SYNC_DIR/plugins/mediaplayer/"
fi

echo "=========================================================="
echo "✅ Đã đóng gói thành công vào content/middle_sync/:"
ls -la "$MIDDLE_SYNC_DIR"
echo "=========================================================="
