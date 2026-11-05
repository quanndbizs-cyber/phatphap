#!/bin/bash
# ==============================================================================
# Script: scripts/config.sh
# Mục đích: Quản lý biến cấu hình tập trung cho toàn bộ các script triển khai.
#           Nạp các thiết lập từ file deploy.env (hoặc .deploy.env) và
#           cho phép ghi đè linh hoạt bằng biến môi trường hoặc tham số lệnh.
# ==============================================================================

# 1. Xác định thư mục cài đặt script và thư mục gốc của Typemill
CONFIG_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_BASE_DIR="$(cd "$CONFIG_SCRIPT_DIR/.." && pwd)"

# 2. Nạp file cấu hình môi trường deploy.env nếu tồn tại
if [[ -f "$CONFIG_SCRIPT_DIR/deploy.env" ]]; then
    # shellcheck source=/dev/null
    source "$CONFIG_SCRIPT_DIR/deploy.env"
elif [[ -f "$CONFIG_BASE_DIR/.deploy.env" ]]; then
    # shellcheck source=/dev/null
    source "$CONFIG_BASE_DIR/.deploy.env"
elif [[ -f "$CONFIG_SCRIPT_DIR/deploy.env.example" ]]; then
    # shellcheck source=/dev/null
    source "$CONFIG_SCRIPT_DIR/deploy.env.example"
fi

# 3. Cấu hình Web Root cục bộ (Local)
# Ưu tiên: Biến môi trường WEB_ROOT -> Giá trị trong file deploy.env -> Tự nhận diện từ thư mục script
if [[ -z "${WEB_ROOT:-}" ]]; then
    WEB_ROOT="$CONFIG_BASE_DIR"
fi
BASE_DIR="$WEB_ROOT"
export WEB_ROOT BASE_DIR

# 4. Cấu hình Web Root trên Remote Server
# Ưu tiên: Biến môi trường REMOTE_WEB_ROOT -> REMOTE_DIR -> File deploy.env -> Mặc định
export REMOTE_WEB_ROOT="${REMOTE_WEB_ROOT:-${REMOTE_DIR:-/var/www/html/phatphap}}"
export REMOTE_DIR="$REMOTE_WEB_ROOT"

# 5. Cấu hình kết nối SSH tới máy chủ từ xa
export SSH_HOST="${SSH_HOST:-192.168.1.22}"
export SSH_PORT="${SSH_PORT:-22}"
export SSH_USER="${SSH_USER:-quannd}"

# Xử lý đường dẫn file SSH Key (mở rộng ký tự ~ nếu có)
RAW_SSH_KEY="${SSH_KEY:-$HOME/.ssh/ssh_key/quannd_id_rsa}"
RAW_SSH_KEY="${RAW_SSH_KEY/#\~/$HOME}"

# Tự động tìm kiếm file SSH Key nếu đường dẫn mặc định chưa trỏ tới đúng file
if [[ ! -f "$RAW_SSH_KEY" ]]; then
    if [[ -f "/root/.ssh/ssh_key/quannd_id_rsa" ]]; then
        RAW_SSH_KEY="/root/.ssh/ssh_key/quannd_id_rsa"
    elif [[ -f "$HOME/.ssh/id_rsa" ]]; then
        RAW_SSH_KEY="$HOME/.ssh/id_rsa"
    fi
fi
export SSH_KEY="$RAW_SSH_KEY"

# 6. Cấu hình URL trang web (phục vụ Warmup cache & Test Kit)
if [[ -z "${WEB_URL:-}" ]]; then
    if [[ -f "$BASE_DIR/settings/settings.yaml" ]]; then
        DETECTED_URL=$(grep "^url:" "$BASE_DIR/settings/settings.yaml" 2>/dev/null | awk '{print $2}' | tr -d "'" | tr -d '"' || true)
        if [[ -n "$DETECTED_URL" ]]; then
            WEB_URL="$DETECTED_URL"
        fi
    fi
fi
export WEB_URL="${WEB_URL:-http://localhost/phatphap}"
export WEB_URL="${WEB_URL%/}"
