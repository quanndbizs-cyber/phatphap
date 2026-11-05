#!/bin/bash
# ==============================================================================
# Script: remote_one_click_deploy.sh
# Mục đích: Triển khai 1-Click tự động hóa toàn diện từ máy Local lên Remote Server:
#
#   * KHI CHẠY TẠI LOCAL (Mặc định khi chạy từ máy phát triển):
#     - Đóng gói media, plugins vào content/middle_sync/
#     - Tự động kiểm tra, commit & push nhánh content lên GitHub
#     - Tự động kiểm tra, commit & push nhánh web root (v2.x) lên GitHub
#     - Kết nối SSH tới Server và chạy remote deploy với sudo:
#       ssh quannd@192.168.1.22 -i ~/.ssh/ssh_key/quannd_id_rsa
#
#   * KHI CHẠY TRÊN SERVER (Hoặc khi có cờ --server / chạy qua sudo):
#     Giai đoạn 1: Web root
#       - Tự xác định thư mục web từ vị trí script
#       - Kiểm tra có thư mục content/
#       - Kiểm tra web root có Git repository riêng
#       - Chạy git pull --ff-only để cập nhật toàn bộ repository web
#     Giai đoạn 2: Content
#       - Gọi scripts/deploy_server.sh
#       - Tiếp tục pull Git repository riêng trong content/
#       - Đồng bộ middle_sync/ vào Typemill
#       - Xóa cache, phân quyền và reload Nginx/PHP-FPM theo script hiện tại
#
# Sử dụng:
#   ./scripts/remote_one_click_deploy.sh                 # Chạy tự động từ Local lên Server
#   ./scripts/remote_one_click_deploy.sh --skip-push     # Deploy từ Local không push lại
#   sudo ./scripts/remote_one_click_deploy.sh            # Chạy trực tiếp trên Server (hoặc --server)
# ==============================================================================

set -Eeuo pipefail

trap 'rc=$?; echo -e "\n\033[1;31m[ERROR] Deployment halted at line ${LINENO} (exit code: ${rc}).\033[0m"; exit "$rc"' ERR

# ------------------------------------------------------------------------------
# 0. CẤU HÌNH MẶC ĐỊNH & THAM SỐ
# ------------------------------------------------------------------------------
DEFAULT_SSH_KEY="$HOME/.ssh/ssh_key/quannd_id_rsa"
DEFAULT_SSH_USER="quannd"
DEFAULT_SSH_HOST="192.168.1.22"
DEFAULT_REMOTE_DIR="/var/www/html/phatphap"

SSH_KEY="$DEFAULT_SSH_KEY"
SSH_USER="$DEFAULT_SSH_USER"
SSH_HOST="$DEFAULT_SSH_HOST"
REMOTE_DIR="$DEFAULT_REMOTE_DIR"

MODE=""
SKIP_PUSH=false

# Xác định thư mục cài đặt gốc từ vị trí file script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

show_help() {
    cat << EOF
Sử dụng: $0 [TUỲ CHỌN]

Tuỳ chọn:
  --server           Chạy trực tiếp quy trình triển khai trên server (Giai đoạn 1 & Giai đoạn 2)
  --remote           Chạy từ máy Local: sync, commit/push và kích hoạt SSH lên server
  -i, --key=PATH     Đường dẫn file SSH private key (mặc định: $DEFAULT_SSH_KEY)
  --user=USER        Tên người dùng SSH trên remote server (mặc định: $DEFAULT_SSH_USER)
  --host=HOST        Địa chỉ IP hoặc Hostname remote server (mặc định: $DEFAULT_SSH_HOST)
  --path=DIR         Đường dẫn thư mục web trên server (mặc định: $DEFAULT_REMOTE_DIR)
  --skip-push        Bỏ qua bước đóng gói và git push tại local trước khi SSH
  -h, --help         Hiển thị bảng trợ giúp này

Ví dụ:
  ./scripts/remote_one_click_deploy.sh
  sudo ./scripts/remote_one_click_deploy.sh
  ./scripts/remote_one_click_deploy.sh --key=~/.ssh/my_key --host=192.168.1.22
EOF
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --server)
            MODE="server"
            shift
            ;;
        --remote)
            MODE="remote"
            shift
            ;;
        -i|--key)
            SSH_KEY="$2"
            shift 2
            ;;
        --key=*)
            SSH_KEY="${1#*=}"
            shift
            ;;
        --user=*)
            SSH_USER="${1#*=}"
            shift
            ;;
        --host=*)
            SSH_HOST="${1#*=}"
            shift
            ;;
        --path=*)
            REMOTE_DIR="${1#*=}"
            shift
            ;;
        --skip-push)
            SKIP_PUSH=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "[WARN] Tham số không xác định: $1 (dùng --help để xem trợ giúp)"
            shift
            ;;
    esac
done

# Tự động nhận diện môi trường nếu MODE chưa được chỉ định cụ thể
if [[ -z "$MODE" ]]; then
    # Nhận diện đang chạy trên Server khi:
    # 1. Có biến SSH session (chạy qua SSH từ xa)
    # 2. Hoặc hostname là máy chủ production (qts-home)
    # 3. Hoặc đường dẫn là /var/www/html/phatphap và không phải môi trường WSL (/mnt/d)
    if [[ -n "${SSH_CLIENT:-}" ]] || [[ -n "${SSH_TTY:-}" ]] || [[ "$(hostname)" == *"qts-home"* ]] || ([[ "$BASE_DIR" == "/var/www/html/phatphap" ]] && [[ ! -d "/mnt/d" ]]); then
        MODE="server"
    else
        MODE="remote"
    fi
fi

# ==============================================================================
# PHẦN A: THỰC THI TRÊN SERVER (STAGE 1 & STAGE 2)
# ==============================================================================
run_server_deployment() {
    echo "=================================================================="
    echo "🚀 [SERVER DEPLOY] BẮT ĐẦU TRIỂN KHAI TRÊN MÁY CHỦ WEB..."
    echo "   Thời gian : $(date '+%Y-%m-%d %H:%M:%S')"
    echo "   Thư mục   : $BASE_DIR"
    echo "   Người chạy: $(whoami) (UID: $(id -u))"
    echo "=================================================================="

    cd "$BASE_DIR"

    # --------------------------------------------------------------------------
    # 1. GIAI ĐOẠN 1: Web root
    # --------------------------------------------------------------------------
    echo -e "\n\033[1;34m[GIAI ĐOẠN 1] Cập nhật toàn bộ Web root repository...\033[0m"

    # 1.1 Tự xác định thư mục web từ vị trí script (đã lưu trong $BASE_DIR)
    echo "  -> 1.1. Thư mục Web root: $BASE_DIR"

    # 1.2 Kiểm tra có thư mục content/
    echo "  -> 1.2. Kiểm tra thư mục content/..."
    if [[ ! -d "$BASE_DIR/content" ]]; then
        echo -e "\033[1;31m[ERROR] Thư mục content/ không tồn tại tại: $BASE_DIR/content\033[0m"
        exit 1
    fi
    echo "     [✓] Thư mục content/ hợp lệ."

    # 1.3 Kiểm tra web root có Git repository riêng
    echo "  -> 1.3. Kiểm tra Git repository của Web root..."
    if [[ ! -d "$BASE_DIR/.git" && ! -f "$BASE_DIR/.git" ]]; then
        echo -e "\033[1;31m[ERROR] Thư mục Web root $BASE_DIR không có Git repository riêng (.git không tồn tại).\033[0m"
        exit 1
    fi
    echo "     [✓] Web root Git repository hợp lệ."

    # 1.4 Thiết lập an toàn cho Git (tránh lỗi dubious ownership khi chạy dưới sudo)
    echo "  -> 1.4. Thiết lập cấu hình an toàn Git cho Web root..."
    git config --global --add safe.directory "$BASE_DIR" 2>/dev/null || true
    git config --global --add safe.directory "$BASE_DIR/content" 2>/dev/null || true
    git -C "$BASE_DIR" config core.fileMode false 2>/dev/null || true

    # Dọn dẹp trạng thái tạm thời để bảo đảm git pull --ff-only không bị chặn
    git -C "$BASE_DIR" checkout -- plugins/mediaplayer/ cache/ media/files/filerestrictions.yaml 2>/dev/null || true

    # 1.5 Chạy git pull --ff-only để cập nhật toàn bộ repository web
    CURRENT_BRANCH=$(git -C "$BASE_DIR" branch --show-current 2>/dev/null || echo "v2.x")
    if [[ -z "$CURRENT_BRANCH" ]]; then
        CURRENT_BRANCH="v2.x"
    fi

    echo "  -> 1.5. Chạy git pull --ff-only (nhánh $CURRENT_BRANCH)..."
    git -C "$BASE_DIR" fetch origin "$CURRENT_BRANCH"
    git -C "$BASE_DIR" pull --ff-only origin "$CURRENT_BRANCH"
    echo -e "     \033[1;32m[✓] Web root repository đã được cập nhật thành công (nhánh $CURRENT_BRANCH)!\033[0m"

    # --------------------------------------------------------------------------
    # 2. GIAI ĐOẠN 2: Content & Dịch vụ
    # --------------------------------------------------------------------------
    echo -e "\n\033[1;34m[GIAI ĐOẠN 2] Triển khai Content & Reload Services qua deploy_server.sh...\033[0m"

    DEPLOY_SCRIPT="$BASE_DIR/scripts/deploy_server.sh"
    if [[ ! -f "$DEPLOY_SCRIPT" ]]; then
        echo -e "\033[1;31m[ERROR] Không tìm thấy script triển khai content: $DEPLOY_SCRIPT\033[0m"
        exit 1
    fi

    chmod +x "$DEPLOY_SCRIPT"
    echo "  -> 2.1. Gọi $DEPLOY_SCRIPT..."
    bash "$DEPLOY_SCRIPT"

    echo -e "\n=================================================================="
    echo -e "\033[1;32m🎉 [HOÀN TẤT] remote_one_click_deploy ĐÃ TRIỂN KHAI THÀNH CÔNG TRÊN SERVER!\033[0m"
    echo "=================================================================="
}

# ==============================================================================
# PHẦN B: THỰC THI TỪ LOCAL (PACK, PUSH, TRIGGER SSH REMOTE DEPLOY)
# ==============================================================================
run_local_and_trigger_remote() {
    echo "=================================================================="
    echo "🌐 [1-CLICK REMOTE DEPLOY] BẮT ĐẦU QUY TRÌNH TỪ LOCAL..."
    echo "   SSH Host : $SSH_USER@$SSH_HOST"
    echo "   SSH Key  : $SSH_KEY"
    echo "   Remote   : $REMOTE_DIR"
    echo "=================================================================="

    cd "$BASE_DIR"

    # 1. Kiểm tra SSH Key tồn tại
    if [[ ! -f "$SSH_KEY" ]]; then
        echo -e "\033[1;31m[ERROR] Không tìm thấy SSH Private Key tại: $SSH_KEY\033[0m"
        echo "Vui lòng chỉ định đường dẫn chính xác bằng -i hoặc --key=<đường_dẫn>"
        exit 1
    fi

    # 2. Đóng gói middle_sync và Git Push nếu không có cờ --skip-push
    if [[ "$SKIP_PUSH" == false ]]; then
        # 2.1 Đóng gói media, plugins vào content/middle_sync/
        echo -e "\n\033[1;34m-> BƯỚC 1: Đóng gói media & plugins vào content/middle_sync/...\033[0m"
        if [[ -f "$BASE_DIR/scripts/pack_middle_sync.sh" ]]; then
            bash "$BASE_DIR/scripts/pack_middle_sync.sh"
        fi

        # 2.2 Commit & Push nhánh content
        echo -e "\n\033[1;34m-> BƯỚC 2: Kiểm tra & Push Git Submodule content...\033[0m"
        cd "$BASE_DIR/content"
        rm -f .git/index.lock 2>/dev/null || true
        git add -A
        if git diff --staged --quiet; then
            echo "   [i] Nhánh content không có thay đổi mới chưa commit."
        else
            COMMIT_MSG="Sync middle_sync & content: $(date '+%Y-%m-%d %H:%M:%S')"
            git commit -m "$COMMIT_MSG"
            echo "   [✓] Đã tạo commit content: $COMMIT_MSG"
        fi
        echo "   [i] Đang push nhánh content lên origin content..."
        git push origin content
        echo -e "   \033[1;32m[✓] Nhánh content đã được push thành công lên GitHub!\033[0m"

        # 2.3 Commit & Push nhánh Web root (v2.x)
        echo -e "\n\033[1;34m-> BƯỚC 3: Kiểm tra & Push Git Web root...\033[0m"
        cd "$BASE_DIR"
        rm -f .git/index.lock 2>/dev/null || true
        git add -A
        if git diff --staged --quiet; then
            echo "   [i] Web root không có thay đổi mới chưa commit."
        else
            COMMIT_MSG="feat(deploy): update remote deployment and codebase ($(date '+%Y-%m-%d %H:%M:%S'))"
            git commit -m "$COMMIT_MSG"
            echo "   [✓] Đã tạo commit Web root: $COMMIT_MSG"
        fi
        CURRENT_LOCAL_BRANCH=$(git branch --show-current 2>/dev/null || echo "v2.x")
        echo "   [i] Đang push Web root lên origin $CURRENT_LOCAL_BRANCH..."
        git push origin "$CURRENT_LOCAL_BRANCH"
        echo -e "   \033[1;32m[✓] Web root đã được push thành công lên GitHub!\033[0m"
    else
        echo -e "\n[INFO] Đã bật cờ --skip-push: Bỏ qua bước commit và push local."
    fi

    # 3. Kết nối SSH và chạy script deploy trên Server
    echo -e "\n\033[1;34m-> BƯỚC 4: Kích hoạt remote deploy trên server qua SSH...\033[0m"
    echo "   Lệnh: ssh -i \"$SSH_KEY\" \"$SSH_USER@$SSH_HOST\" \"$REMOTE_DIR/scripts/remote_one_click_deploy.sh --server\""

    SSH_CMD="ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -i \"$SSH_KEY\" \"$SSH_USER@$SSH_HOST\""

    # Thêm -t nếu đang chạy trong terminal tương tác để nhập sudo password nếu cần
    if [ -t 0 ]; then
        SSH_CMD="ssh -t -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -i \"$SSH_KEY\" \"$SSH_USER@$SSH_HOST\""
    fi

    # Đảm bảo quyền thực thi và chạy deploy trên server
    $SSH_CMD "chmod +x $REMOTE_DIR/scripts/*.sh 2>/dev/null || true; $REMOTE_DIR/scripts/remote_one_click_deploy.sh --server"

    echo -e "\n=================================================================="
    echo -e "\033[1;32m🎉 [HOÀN TẤT] REMOTE ONE CLICK DEPLOY ĐÃ KẾT THÚC THÀNH CÔNG!\033[0m"
    echo "=================================================================="
}

# ------------------------------------------------------------------------------
# ĐIỀU PHỐI CHÍNH
# ------------------------------------------------------------------------------
if [[ "$MODE" == "server" ]]; then
    run_server_deployment
else
    run_local_and_trigger_remote
fi
