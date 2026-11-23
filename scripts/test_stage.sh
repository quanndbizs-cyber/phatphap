#!/bin/bash
# ==============================================================================
# Script: test_stage.sh
# Mục đích: Bộ Test Kit kiểm tra tự động môi trường Stage / Production của Typemill.
#           - Kiểm tra mã HTTP phản hồi (200 OK) của các trang quan trọng
#           - Quét toàn bộ HTML để phát hiện link bất thường (wsl_localhost, dev IP)
#           - Kiểm tra các liên kết navigation đã chuyển sang dạng tương đối
#           - Kiểm tra bảo mật (chặn truy cập trực tiếp settings, data, cache)
#           - Kiểm tra quyền ghi các thư mục dữ liệu
# Sử dụng:
#   ./scripts/test_stage.sh
#   ./scripts/test_stage.sh https://qts-home.duckdns.org/phatphap
#   ./scripts/test_stage.sh http://172.23.75.180/phatphap
# ==============================================================================

# Màu sắc hiển thị
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Nạp cấu hình biến môi trường từ config.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/config.sh"

# Xác định URL mục tiêu (ưu tiên tham số truyền vào $1 -> WEB_URL -> settings.yaml -> localhost)
TARGET_URL="${1:-${WEB_URL:-}}"
if [ -z "$TARGET_URL" ]; then
    # Thử đọc từ settings.yaml
    if [ -f "$BASE_DIR/settings/settings.yaml" ]; then
        CONFIG_URL=$(grep "^url:" "$BASE_DIR/settings/settings.yaml" 2>/dev/null | awk '{print $2}' | tr -d "'" | tr -d '"' || true)
        if [ -n "$CONFIG_URL" ]; then
            TARGET_URL="$CONFIG_URL"
        fi
    fi
fi

# Fallback mặc định
if [ -z "$TARGET_URL" ]; then
    TARGET_URL="http://localhost/phatphap"
fi

# Loại bỏ dấu / ở cuối nếu có
TARGET_URL="${TARGET_URL%/}"

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}🧪 BỘ TEST KIT KIỂM TRA MÔI TRƯỜNG STAGE / PRODUCTION${NC}"
echo -e "   Target URL: ${YELLOW}$TARGET_URL${NC}"
echo -e "   Base Dir  : $BASE_DIR"
echo -e "${BLUE}==================================================================${NC}"

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name="$1"
    local command_result="$2"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$command_result" -eq 0 ]; then
        echo -e "  [${GREEN}PASS${NC}] $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  [${RED}FAIL${NC}] $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# ------------------------------------------------------------------------------
# 1. KIỂM TRA PHẢN HỒI HTTP CỦA CÁC ROUTE CHÍNH
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}1. Kiểm tra HTTP Status Code các route chính:${NC}"

test_http_status() {
    local route="$1"
    local expected_code="${2:-200}"
    local full_url="$TARGET_URL$route"
    
    local code=$(curl -s -k -o /dev/null -w "%{http_code}" --connect-timeout 5 "$full_url" 2>/dev/null)
    code="${code:-000}"

    if [ "$code" == "000" ]; then
        run_test "GET $route (Lỗi kết nối - Không thể kết nối tới $full_url)" 1
    elif [ "$code" == "$expected_code" ]; then
        run_test "GET $route (HTTP $code)" 0
    else
        run_test "GET $route (Kỳ vọng: $expected_code, Nhận được: $code)" 1
    fi
}

test_http_status "/" 200
test_http_status "/phat-giao" 200
test_http_status "/nhan-qua" 200
test_http_status "/giao-duc" 200
test_http_status "/thong-bao" 200
test_http_status "/tm/login" 200

# ------------------------------------------------------------------------------
# 2. KIỂM TRA PHÁT HIỆN LINK BẤT THƯỜNG TRONG HTML (WSL_LOCALHOST / DEV LINK)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}2. Quét HTML phát hiện link bất thường & kiểm tra URL tương đối:${NC}"

TMP_HTML=$(mktemp)
curl -s -k "$TARGET_URL/" > "$TMP_HTML" 2>/dev/null || true

# 2.1 Kiểm tra xem có chứa wsl_localhost hay không
if grep -q "wsl_localhost" "$TMP_HTML"; then
    run_test "Phát hiện link dính 'wsl_localhost' trong HTML trang chủ!" 1
else
    run_test "Không có link 'wsl_localhost' trong HTML" 0
fi

# 2.2 Kiểm tra xem có link relative cho menu không
if grep -q 'href="/phatphap/thong-bao"' "$TMP_HTML" || grep -q 'href="/phatphap/phat-giao"' "$TMP_HTML"; then
    run_test "Menu điều hướng sử dụng đúng Relative URL (/phatphap/...)" 0
else
    # Kiểm tra xem có link tương đối chung dạng href="/..."
    if grep -q 'href="/' "$TMP_HTML"; then
        run_test "Tìm thấy Relative URL trong trang chủ" 0
    else
        run_test "Chưa phát hiện Relative URL trong menu trang chủ" 1
    fi
fi
rm -f "$TMP_HTML"

# ------------------------------------------------------------------------------
# 3. KIỂM TRA BẢO MẬT (SECURITY HEADERS & CHẶN TRUY CẬP THƯ MỤC NHẠY CẢM)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}3. Kiểm tra bảo mật Nginx (Chặn truy cập file/thư mục nhạy cảm):${NC}"

test_security_blocked() {
    local route="$1"
    local full_url="$TARGET_URL$route"
    local code=$(curl -s -k -o /dev/null -w "%{http_code}" --connect-timeout 5 "$full_url" 2>/dev/null)
    code="${code:-000}"
    
    if [ "$code" == "000" ]; then
        run_test "GET $route (Lỗi kết nối - Không thể kết nối tới $full_url)" 1
    elif [ "$code" == "403" ] || [ "$code" == "404" ]; then
        run_test "Chặn truy cập $route (HTTP $code - OK)" 0
    else
        run_test "CẢNH BÁO: $route không bị chặn! (HTTP $code)" 1
    fi
}

test_security_blocked "/settings/settings.yaml"
test_security_blocked "/data/navigation/"
test_security_blocked "/content/index.yaml"
test_security_blocked "/cache/"

# ------------------------------------------------------------------------------
# 4. KIỂM TRA PHÂN QUYỀN LOCAL FILE SYSTEM (NẾU CHẠY TRỰC TIẾP TRÊN MÁY CHỦ)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}4. Kiểm tra quyền ghi thư mục hệ thống (Local Filesystem):${NC}"

test_folder_writable() {
    local folder="$1"
    local path="$BASE_DIR/$folder"
    if [ -d "$path" ] && [ -w "$path" ]; then
        run_test "Thư mục $folder/ tồn tại và có quyền ghi" 0
    else
        run_test "Thư mục $folder/ thiếu quyền ghi hoặc không tồn tại" 1
    fi
}

test_folder_writable "cache"
test_folder_writable "content"
test_folder_writable "data"
test_folder_writable "media"
test_folder_writable "settings"

# ------------------------------------------------------------------------------
# TỔNG KẾT BÁO CÁO
# ------------------------------------------------------------------------------
echo -e "\n${BLUE}==================================================================${NC}"
echo -e "📊 ${YELLOW}KẾT QUẢ ĐÁNH GIÁ TỔNG THỂ:${NC}"
echo -e "   Tổng số bài test : $TOTAL_TESTS"
echo -e "   Thành công        : ${GREEN}$PASSED_TESTS${NC}"
echo -e "   Thất bại          : ${RED}$FAILED_TESTS${NC}"

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "🎉 ${GREEN}TẤT CẢ CÁC BÀI TEST ĐỀU ĐẠT! HỆ THỐNG SẴN SÀNG CHO PRODUCTION.${NC}"
    echo -e "${BLUE}==================================================================${NC}"
    exit 0
else
    echo -e "⚠️  ${RED}CÓ $FAILED_TESTS BÀI TEST KHÔNG ĐẠT. VUI LÒNG KIỂM TRA LẠI CẤU HÌNH.${NC}"
    echo -e "${BLUE}==================================================================${NC}"
    exit 1
fi
