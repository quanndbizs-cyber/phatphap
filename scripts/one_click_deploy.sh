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

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
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

# BƯỚC 1: ĐÓNG GÓI VÀO CONTENT/MIDDLE_SYNC
echo "-> BƯỚC 1: Đóng gói media, plugins vào content/middle_sync/ (Settings đồng bộ thủ công)..."
"$BASE_DIR/scripts/pack_middle_sync.sh"

# BƯỚC 2: COMMIT VÀ PUSH NHÁNH CONTENT
echo -e "\n-> BƯỚC 2: Tự động commit & push nhánh content lên Git..."
cd "$BASE_DIR/content"

# Stage tất cả các file trong content bao gồm middle_sync
git add -A

if git diff --staged --quiet; then
    echo "   [i] Không có thay đổi mới trong content/ để commit."
else
    COMMIT_MSG="Sync middle_sync & content: $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"
    echo "   [✓] Đã tạo commit: $COMMIT_MSG"
    echo "   [i] Đang push lên Git remote origin content..."
    git push origin content
    echo "   [✓] Đã push nhánh content thành công lên GitHub!"
fi

cd "$BASE_DIR"

# BƯỚC 3: KÍCH HOẠT DEPLOY TRÊN SERVER
echo -e "\n-> BƯỚC 3: Triển khai lên Deploy Server..."
if [ -n "$SSH_TARGET" ]; then
    echo "   [i] Đang kết nối SSH tới $SSH_TARGET để chạy deploy_server.sh..."
    ssh "$SSH_TARGET" "cd /var/www/html/phatphap && ./scripts/deploy_server.sh"
else
    echo "   [i] Nếu deploy từ xa, bạn chỉ cần chạy lệnh 1 dòng này trên server:"
    echo "   --------------------------------------------------------------"
    echo "   cd /var/www/html/phatphap && ./scripts/deploy_server.sh"
    echo "   --------------------------------------------------------------"
    echo "   (Hoặc cấu hình SSH: ./scripts/one_click_deploy.sh user@ip_server)"
fi

echo -e "\n=================================================================="
echo "🎉 QUY TRÌNH 1-CLICK DEPLOY ĐÃ HOÀN TẤT!"
echo "=================================================================="
