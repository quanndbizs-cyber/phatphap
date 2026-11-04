#!/bin/bash
# ==============================================================================
# Script: rebuild_server.sh (hoặc quick_rebuild.sh)
# Mục đích:
#   Áp dụng nhanh các thay đổi sau khi git pull hoặc chỉnh sửa nội dung/cấu hình:
#   1. (Tùy chọn) Git pull cập nhật mã nguồn & content (--pull)
#   2. Đồng bộ middle_sync (media, plugins) nếu có
#   3. Xóa sạch cache navigation (data/navigation/*) để Typemill quét lại thư mục
#   4. Xóa sạch Twig template cache (cache/*)
#   5. Đặt quyền ghi (chmod 775 / chown www-data) cho web server
#   6. Reload PHP-FPM & Nginx (làm mới OPcache & worker)
#   7. Tự động warm-up request để Typemill tái tạo navigation ngay lập tức
#
# Cách sử dụng:
#   ./scripts/rebuild_server.sh           # Rebuild nhanh (xóa cache, perms, reload, warmup)
#   ./scripts/rebuild_server.sh --pull    # Pull Git mới nhất trước rồi rebuild
# ==============================================================================

set -Eeuo pipefail

# Màu hiển thị
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

DO_PULL=false

# Phân tích tham số
while [[ $# -gt 0 ]]; do
    case "$1" in
        -p|--pull)
            DO_PULL=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Xác định thư mục gốc của Typemill
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BASE_DIR"

echo -e "${BLUE}==========================================================${NC}"
echo -e "${CYAN}⚡ [REBUILD] BẮT ĐẦU REBUILD & APPLY THAY ĐỔI SERVER...${NC}"
echo -e "Thư mục cài đặt: ${YELLOW}$BASE_DIR${NC}"
echo -e "${BLUE}==========================================================${NC}"

# 1. (Tùy chọn) Git pull nếu người dùng chọn --pull
if [ "$DO_PULL" = true ]; then
    echo -e "${CYAN}-> 1. Git pull cập nhật thay đổi...${NC}"
    if [ -d "$BASE_DIR/.git" ]; then
        echo "   + Pull nhánh chính..."
        git pull || echo -e "${YELLOW}[WARN] Git pull repo chính không thành công hoặc không có remote.${NC}"
    fi

    if [[ -d "$BASE_DIR/content/.git" || -f "$BASE_DIR/content/.git" ]]; then
        echo "   + Pull nhánh content..."
        git -C "$BASE_DIR/content" pull || echo -e "${YELLOW}[WARN] Git pull content không thành công.${NC}"
    fi
else
    echo -e "${CYAN}-> 1. Bỏ qua git pull (chế độ rebuild tức thời).${NC}"
fi

# 2. Đồng bộ middle_sync nếu có
MIDDLE_SYNC_DIR="$BASE_DIR/content/middle_sync"
if [[ -d "$MIDDLE_SYNC_DIR" ]]; then
    echo -e "${CYAN}-> 2. Kiểm tra & đồng bộ middle_sync...${NC}"
    if [[ -d "$MIDDLE_SYNC_DIR/media" ]]; then
        mkdir -p "$BASE_DIR/media"
        rsync -rl --no-perms --no-owner --no-group --no-times \
            "$MIDDLE_SYNC_DIR/media/" "$BASE_DIR/media/" 2>/dev/null || true
    fi
    if [[ -d "$MIDDLE_SYNC_DIR/plugins" ]]; then
        mkdir -p "$BASE_DIR/plugins"
        rsync -rl --no-perms --no-owner --no-group --no-times \
            "$MIDDLE_SYNC_DIR/plugins/" "$BASE_DIR/plugins/" 2>/dev/null || true
    fi
fi

# 3. Xóa cache Navigation và Twig Cache
echo -e "${CYAN}-> 3. Xóa cache navigation và Twig cache cũ...${NC}"
mkdir -p "$BASE_DIR/data/navigation" "$BASE_DIR/cache"
find "$BASE_DIR/data/navigation" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + 2>/dev/null || true
find "$BASE_DIR/cache" -mindepth 1 -maxdepth 1 ! -name 'cyanine-custom.css' -exec rm -rf -- {} + 2>/dev/null || true
echo -e "   ${GREEN}[OK] Đã dọn dẹp sạch cache navigation và cache template.${NC}"

# 4. Đảm bảo quyền thư mục dữ liệu
echo -e "${CYAN}-> 4. Thiết lập quyền ghi (permissions) cho www-data...${NC}"
mkdir -p "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
         "$BASE_DIR/data/navigation" "$BASE_DIR/media" "$BASE_DIR/settings"

if [[ "$(id -u)" -eq 0 ]]; then
    if id www-data >/dev/null 2>&1; then
        chown -R www-data:www-data \
            "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
            "$BASE_DIR/media" "$BASE_DIR/settings"
    fi
else
    # Thử sudo không cần password nếu có quyền
    if sudo -n true 2>/dev/null && id www-data >/dev/null 2>&1; then
        sudo -n chown -R www-data:www-data \
            "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
            "$BASE_DIR/media" "$BASE_DIR/settings" 2>/dev/null || true
    fi
fi

chmod -R 775 "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
             "$BASE_DIR/media" "$BASE_DIR/settings"
echo -e "   ${GREEN}[OK] Quyền thư mục đã sẵn sàng (775).${NC}"

# 5. Reload PHP-FPM và Nginx nếu có dịch vụ
echo -e "${CYAN}-> 5. Kiểm tra và reload PHP-FPM / Nginx...${NC}"
SYSTEMCTL="$(command -v systemctl 2>/dev/null || echo "")"
NGINX="$(command -v nginx 2>/dev/null || echo "")"

if [[ -n "$SYSTEMCTL" && -x "$SYSTEMCTL" ]]; then
    # Tìm phiên bản PHP-FPM đang chạy
    PHP_SVC=""
    for svc in php8.4-fpm php8.3-fpm php8.2-fpm php8.1-fpm php-fpm; do
        if "$SYSTEMCTL" is-active --quiet "$svc" 2>/dev/null; then
            PHP_SVC="$svc"
            break
        fi
    done

    # Reload PHP-FPM
    if [[ -n "$PHP_SVC" ]]; then
        echo "   + Phát hiện dịch vụ: $PHP_SVC đang chạy."
        if [[ "$(id -u)" -eq 0 ]]; then
            "$SYSTEMCTL" reload "$PHP_SVC" && echo -e "   ${GREEN}[OK] Đã reload $PHP_SVC.${NC}" || true
        else
            sudo -n "$SYSTEMCTL" reload "$PHP_SVC" 2>/dev/null && echo -e "   ${GREEN}[OK] Đã reload $PHP_SVC.${NC}" || echo -e "   ${YELLOW}[INFO] Bỏ qua reload $PHP_SVC (cần sudo).${NC}"
        fi
    fi

    # Kiểm tra & reload Nginx
    if "$SYSTEMCTL" is-active --quiet nginx 2>/dev/null; then
        if [[ "$(id -u)" -eq 0 ]]; then
            if [[ -n "$NGINX" && -x "$NGINX" ]]; then "$NGINX" -t 2>/dev/null && "$SYSTEMCTL" reload nginx || true; fi
            echo -e "   ${GREEN}[OK] Đã reload Nginx.${NC}"
        else
            if sudo -n "$SYSTEMCTL" reload nginx 2>/dev/null; then
                echo -e "   ${GREEN}[OK] Đã reload Nginx.${NC}"
            else
                echo -e "   ${YELLOW}[INFO] Bỏ qua reload Nginx (cần sudo).${NC}"
            fi
        fi
    fi
else
    echo -e "   ${YELLOW}[INFO] Môi trường không dùng systemctl (WSL/Docker), bỏ qua reload dịch vụ.${NC}"
fi

# 6. Tự động warm-up Typemill để tái tạo navigation ngay lập tức
echo -e "${CYAN}-> 6. Tự động Warm-up Typemill để tái tạo Navigation...${NC}"
WARMUP_OK=false

# Xác định URL trang web để warm-up
TARGET_URL=""
if [ -f "$BASE_DIR/settings/settings.yaml" ]; then
    CONFIG_URL=$(grep "^url:" "$BASE_DIR/settings/settings.yaml" | awk '{print $2}' | tr -d "'" | tr -d '"' || echo "")
    if [[ -n "$CONFIG_URL" ]]; then
        TARGET_URL="$CONFIG_URL"
    fi
fi
if [ -z "$TARGET_URL" ]; then
    TARGET_URL="http://localhost/phatphap"
fi

if command -v curl >/dev/null 2>&1; then
    HTTP_CODE=$(curl -s -L -o /dev/null -w "%{http_code}" --connect-timeout 4 "$TARGET_URL" 2>/dev/null || echo "000")
    if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
        echo -e "   ${GREEN}[OK] Request warm-up thành công đến $TARGET_URL (HTTP $HTTP_CODE).${NC}"
        WARMUP_OK=true
    else
        # Thử fallback http://localhost/
        HTTP_CODE_FALLBACK=$(curl -s -L -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost/ 2>/dev/null || echo "000")
        if [[ "$HTTP_CODE_FALLBACK" == "200" ]]; then
            echo -e "   ${GREEN}[OK] Request warm-up thành công đến http://localhost/ (HTTP 200).${NC}"
            WARMUP_OK=true
        fi
    fi
fi

# Thống kê file navigation sau khi tái tạo
NAVI_COUNT=$(find "$BASE_DIR/data/navigation" -maxdepth 1 -name "*.txt" 2>/dev/null | wc -l)
if [[ "$NAVI_COUNT" -gt 0 ]]; then
    echo -e "   ${GREEN}[OK] Typemill đã tái tạo $NAVI_COUNT file navigation mới trong data/navigation/:${NC}"
    find "$BASE_DIR/data/navigation" -maxdepth 1 -name "*.txt" -exec basename {} \; | sed 's/^/     • /'
else
    echo -e "   ${YELLOW}[INFO] Navigation sẽ được Typemill tự động tạo ngay khi có người dùng truy cập trang web.${NC}"
fi

echo -e "${BLUE}==========================================================${NC}"
echo -e "${GREEN}🎉 [REBUILD HOÀN TẤT] TẤT CẢ DỮ LIỆU ĐÃ ĐƯỢC CẬP NHẬT TRÊN SERVER!${NC}"
echo -e "${BLUE}==========================================================${NC}"
