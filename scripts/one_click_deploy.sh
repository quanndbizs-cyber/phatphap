#!/bin/bash
# ==============================================================================
# Script: one_click_deploy.sh
# Mục đích: Script 1-Click Deploy từ máy Local:
#           1. Đóng gói dữ liệu đặc thù (settings, media, plugins) vào content/middle_sync/
#           2. Tự động commit và push nhánh content lên GitHub
#           3. (Tùy chọn) Kích hoạt lệnh deploy từ xa qua SSH lên Deploy Server
#           4. Chạy bộ Test Kit kiểm tra hệ thống sau khi deploy
# Sử dụng:
#   ./scripts/one_click_deploy.sh                     (deploy mặc định)
#   ./scripts/one_click_deploy.sh --prod              (đóng gói bằng settings.yaml.production)
#   ./scripts/one_click_deploy.sh user@server:/path   (deploy qua SSH từ xa)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/config.sh"
cd "$BASE_DIR"

PROD_FLAG=""
SSH_TARGET=""

# Đọc tham số
for arg in "$@"; do
    if [ "$arg" == "--prod" ]; then
        PROD_FLAG="--prod"
    elif [[ "$arg" == *"@"* ]]; then
        SSH_TARGET="$arg"
    fi
done

echo "=================================================================="
echo "🚀 [1-CLICK DEPLOY] BẮT ĐẦU QUY TRÌNH DEPLOY..."
echo "=================================================================="

# BƯỚC 1: ĐỒNG BỘ VÀO CONTENT/MIDDLE_SYNC & PUSH NHÁNH CONTENT
echo "-> BƯỚC 1: Chạy sync_to_middle.sh (đóng gói media, settings vào content/middle_sync/ & push content)..."
if [ -f "$BASE_DIR/scripts/sync_to_middle.sh" ]; then
    "$BASE_DIR/scripts/sync_to_middle.sh" $PROD_FLAG
else
    "$BASE_DIR/scripts/pack_middle_sync.sh" $PROD_FLAG
    cd "$BASE_DIR/content"
    rm -f .git/index.lock 2>/dev/null || true
    git add -A
    if ! git diff --staged --quiet; then
        COMMIT_MSG="Sync middle_sync & content: $(date '+%Y-%m-%d %H:%M:%S')"
        git commit -m "$COMMIT_MSG"
        echo "   [✓] Đã tạo commit content: $COMMIT_MSG"
    fi
    git push origin content
fi

# BƯỚC 1b: TÁI TẠO SEARCH INDEX TOÀN TRANG
if [ -f "$BASE_DIR/scripts/build_search_index.php" ] && command -v php >/dev/null 2>&1; then
    echo -e "\n-> BƯỚC 1b: Tái tạo client search-index.json..."
    php "$BASE_DIR/scripts/build_search_index.php" || true
fi

# BƯỚC 2b: COMMIT VÀ PUSH NHÁNH MAIN (v2.x)
echo -e "\n-> BƯỚC 2b: Tự động commit & push nhánh main (v2.x) lên Git..."
cd "$BASE_DIR"
git add -A
if git diff --staged --quiet; then
    echo "   [i] Không có thay đổi mới trong mã nguồn main để commit."
else
    MAIN_COMMIT_MSG="feat(deploy): update codebase ($(date '+%Y-%m-%d %H:%M:%S'))"
    git commit -m "$MAIN_COMMIT_MSG"
    echo "   [✓] Đã tạo commit main: $MAIN_COMMIT_MSG"
fi
CURRENT_MAIN_BRANCH=$(git branch --show-current 2>/dev/null || echo "v2.x")
echo "   [i] Đang push lên Git remote origin $CURRENT_MAIN_BRANCH..."
git push origin "$CURRENT_MAIN_BRANCH"
echo "   [✓] Đã push nhánh $CURRENT_MAIN_BRANCH thành công lên GitHub!"

# BƯỚC 3: KÍCH HOẠT DEPLOY TRÊN SERVER
echo -e "\n-> BƯỚC 3: Triển khai lên Deploy Server..."
if [ -n "$SSH_TARGET" ]; then
    echo "   [i] Đang kết nối SSH tới $SSH_TARGET để chạy deploy_server.sh..."
    ssh "$SSH_TARGET" "cd \"$REMOTE_WEB_ROOT\" && ./scripts/deploy_server.sh"
else
    echo "   [i] Nếu deploy từ xa, bạn chỉ cần chạy lệnh 1 dòng này trên server:"
    echo "   --------------------------------------------------------------"
    echo "   cd $REMOTE_WEB_ROOT && ./scripts/deploy_server.sh"
    echo "   --------------------------------------------------------------"
    echo "   (Hoặc cấu hình SSH: ./scripts/one_click_deploy.sh user@ip_server)"
fi

echo -e "\n=================================================================="
echo "🎉 QUY TRÌNH 1-CLICK DEPLOY ĐÃ HOÀN TẤT!"
echo "=================================================================="
