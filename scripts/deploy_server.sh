#!/bin/bash
# ==============================================================================
# Script: deploy_server.sh
# Purpose:
#   1. Pull main branch (v2.x) and content branch with --rebase --autostash.
#   2. Sync middle_sync into Typemill (settings, media - EXCLUDING plugins).
#   3. Pre-deploy verification (PHP syntax check & Nginx configuration).
#   4. Clear cache, set writable permissions, reload PHP-FPM/Nginx.
#   5. Run test kit (test_stage.sh) with automatic rollback on failure.
#   6. Report detailed changes (commits and diff stats) upon completion.
#
# Run as the deploy user (or sudo):
#   ./scripts/deploy_server.sh
#   ./scripts/deploy_server.sh --force
#   ./scripts/deploy_server.sh --skip-test
# ==============================================================================

set -Eeuo pipefail

# Nạp cấu hình biến môi trường từ config.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/config.sh"
cd "$BASE_DIR"

FORCE_PULL=false
SKIP_TEST=false
NO_ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -f|--force)
            FORCE_PULL=true
            shift
            ;;
        --skip-test)
            SKIP_TEST=true
            shift
            ;;
        --no-rollback)
            NO_ROLLBACK=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Lưu lại commit SHA ban đầu trước khi deploy để phục vụ rollback và báo cáo thay đổi
OLD_MAIN_HEAD="$(git -C "$BASE_DIR" rev-parse HEAD 2>/dev/null || echo "")"
OLD_CONTENT_HEAD="$(git -C "$BASE_DIR/content" rev-parse HEAD 2>/dev/null || echo "")"
MAIN_BRANCH="$(git -C "$BASE_DIR" branch --show-current 2>/dev/null || echo "v2.x")"
[[ -z "$MAIN_BRANCH" ]] && MAIN_BRANCH="v2.x"

echo "=========================================================="
echo "🚀 [DEPLOY] BẮT ĐẦU QUÁ TRÌNH DEPLOY TRÊN SERVER..."
echo "Thư mục cài đặt : $BASE_DIR"
echo "Nhánh chính     : $MAIN_BRANCH (Commit ban đầu: ${OLD_MAIN_HEAD:0:8})"
echo "Nhánh content   : content (Commit ban đầu: ${OLD_CONTENT_HEAD:0:8})"
if [[ "$FORCE_PULL" == "true" ]]; then
    echo "Chế độ          : FORCE PULL (Reset hard về commit mới nhất trên remote)"
fi
echo "=========================================================="

# ------------------------------------------------------------------------------
# HÀM ROLLBACK TỰ ĐỘNG KHI GẶP LỖI HOẶC TEST THẤT BẠI
# ------------------------------------------------------------------------------
rollback_deployment() {
    local reason="${1:-Lỗi không xác định}"
    echo -e "\n\033[1;31m=========================================================="
    echo "⚠️ [ROLLBACK] DEPLOY THẤT BẠI - BẮT ĐẦU HOÀN NGUYÊN HỆ THỐNG!"
    echo "Lý do: $reason"
    echo -e "==========================================================\033[0m"

    if [[ "$NO_ROLLBACK" == "true" ]]; then
        echo "   [!] Đã bật cờ --no-rollback: Giữ nguyên trạng thái hiện tại, không khôi phục."
        exit 1
    fi

    # 1. Hủy bỏ bất kỳ tiến trình rebase nào đang dở dang
    git -C "$BASE_DIR" rebase --abort 2>/dev/null || true
    git -C "$BASE_DIR/content" rebase --abort 2>/dev/null || true

    # 2. Khôi phục Web root về commit ban đầu
    if [[ -n "$OLD_MAIN_HEAD" && -d "$BASE_DIR/.git" ]]; then
        echo "   -> Đang khôi phục Web root ($MAIN_BRANCH) về commit: ${OLD_MAIN_HEAD:0:8}..."
        git -C "$BASE_DIR" reset --hard "$OLD_MAIN_HEAD" 2>/dev/null || true
    fi

    # 3. Khôi phục Content về commit ban đầu
    if [[ -n "$OLD_CONTENT_HEAD" && -d "$BASE_DIR/content/.git" ]]; then
        echo "   -> Đang khôi phục Content về commit: ${OLD_CONTENT_HEAD:0:8}..."
        git -C "$BASE_DIR/content" reset --hard "$OLD_CONTENT_HEAD" 2>/dev/null || true
    fi

    # 4. Dọn dẹp cache và khởi động lại dịch vụ để đưa web về trạng thái ổn định
    echo "   -> Xóa cache và khởi động lại dịch vụ sau rollback..."
    mkdir -p "$BASE_DIR/data/navigation" "$BASE_DIR/cache"
    find "$BASE_DIR/data/navigation" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + 2>/dev/null || true
    find "$BASE_DIR/cache" -mindepth 1 -maxdepth 1 ! -name 'cyanine-custom.css' -exec rm -rf -- {} + 2>/dev/null || true

    if command -v systemctl >/dev/null 2>&1; then
        if [[ "$(id -u)" -eq 0 ]]; then
            systemctl reload php8.4-fpm 2>/dev/null || true
            systemctl reload nginx 2>/dev/null || true
        else
            sudo -n systemctl reload php8.4-fpm 2>/dev/null || true
            sudo -n systemctl reload nginx 2>/dev/null || true
        fi
    fi

    echo -e "\033[1;33m[ROLLBACK HOÀN TẤT] Hệ thống đã trở về trạng thái an toàn trước khi deploy.\033[0m"
    exit 1
}

# Trap ERR để tự động kích hoạt rollback nếu có lệnh trả về lỗi không mong muốn
trap 'rc=$?; rollback_deployment "Lỗi phát sinh tại dòng ${LINENO} (mã thoát: ${rc})"' ERR

# Cấu hình safe.directory cho Git
git config --global --add safe.directory "$BASE_DIR" 2>/dev/null || true
git config --global --add safe.directory "$BASE_DIR/content" 2>/dev/null || true

# ------------------------------------------------------------------------------
# BƯỚC 1: CẬP NHẬT MÃ NGUỒN CHÍNH (WEB ROOT / MAIN BRANCH v2.x)
# ------------------------------------------------------------------------------
echo -e "\n-> 1. Cập nhật nhánh chính Web root ($MAIN_BRANCH) từ Git remote..."
if [[ -d "$BASE_DIR/.git" || -f "$BASE_DIR/.git" ]]; then
    git -C "$BASE_DIR" config core.fileMode false 2>/dev/null || true
    git -C "$BASE_DIR" checkout -- plugins/mediaplayer/ cache/ media/files/filerestrictions.yaml themes/tinhdo/js/search-index.json 2>/dev/null || true
    
    echo "   + Fetching remote origin $MAIN_BRANCH..."
    git -C "$BASE_DIR" fetch origin "$MAIN_BRANCH"

    if [[ "$FORCE_PULL" == "true" ]]; then
        echo "   [!] Chế độ Force: reset hard về remotes/origin/$MAIN_BRANCH..."
        git -C "$BASE_DIR" reset --hard "remotes/origin/$MAIN_BRANCH"
    else
        echo "   [i] Kéo cập nhật với --rebase và --autostash..."
        if ! git -C "$BASE_DIR" pull --rebase --autostash origin "$MAIN_BRANCH"; then
            echo "   [!] Phát hiện phân kỳ hoặc xung đột khi rebase Web root."
            git -C "$BASE_DIR" rebase --abort 2>/dev/null || true
            rollback_deployment "Xung đột khi git pull --rebase trên nhánh $MAIN_BRANCH"
        fi
    fi
    echo "   [✓] Nhánh chính ($MAIN_BRANCH) đã được cập nhật thành công."
else
    rollback_deployment "Thư mục $BASE_DIR không phải là Git repository hợp lệ."
fi

# ------------------------------------------------------------------------------
# BƯỚC 2: CẬP NHẬT NHÁNH CONTENT (content/)
# ------------------------------------------------------------------------------
echo -e "\n-> 2. Cập nhật nhánh content từ Git remote..."
if [[ -d "$BASE_DIR/content/.git" || -f "$BASE_DIR/content/.git" ]]; then
    git -C "$BASE_DIR/content" config core.fileMode false 2>/dev/null || true
    git -C "$BASE_DIR/content" checkout -- . 2>/dev/null || true
    git -C "$BASE_DIR/content" branch -D origin/content 2>/dev/null || true
    git -C "$BASE_DIR/content" checkout content 2>/dev/null || true
    
    echo "   + Fetching remote origin content..."
    git -C "$BASE_DIR/content" fetch origin content

    if [[ "$FORCE_PULL" == "true" ]]; then
        echo "   [!] Chế độ Force: reset hard về remotes/origin/content..."
        git -C "$BASE_DIR/content" reset --hard remotes/origin/content
    else
        echo "   [i] Kéo cập nhật với --rebase và --autostash..."
        if ! git -C "$BASE_DIR/content" pull --rebase --autostash origin content; then
            echo "   [!] Phát hiện phân kỳ hoặc xung đột khi rebase content."
            git -C "$BASE_DIR/content" rebase --abort 2>/dev/null || true
            rollback_deployment "Xung đột khi git pull --rebase trên nhánh content"
        fi
    fi
    echo "   [✓] Nhánh content đã được cập nhật thành công."
else
    rollback_deployment "Thư mục $BASE_DIR/content không phải là Git repository."
fi

# ------------------------------------------------------------------------------
# BƯỚC 3: ĐỒNG BỘ MIDDLE_SYNC (CHỈ SETTINGS & MEDIA - KHÔNG COPY PLUGINS)
# ------------------------------------------------------------------------------
MIDDLE_SYNC_DIR="$BASE_DIR/content/middle_sync"

if [[ -d "$MIDDLE_SYNC_DIR" ]]; then
    echo -e "\n-> 3. Đồng bộ dữ liệu từ $MIDDLE_SYNC_DIR (chỉ settings, media; KHÔNG copy plugins)..."

    if [[ -f "$MIDDLE_SYNC_DIR/settings/settings.yaml" ]]; then
        echo "   + Đồng bộ settings/settings.yaml..."
        mkdir -p "$BASE_DIR/settings"
        cp -f "$MIDDLE_SYNC_DIR/settings/settings.yaml" "$BASE_DIR/settings/settings.yaml"
    fi

    if [[ -d "$MIDDLE_SYNC_DIR/media" ]]; then
        echo "   + Đồng bộ media/..."
        mkdir -p "$BASE_DIR/media"
        rsync -rl --no-perms --no-owner --no-group --no-times \
            "$MIDDLE_SYNC_DIR/media/" "$BASE_DIR/media/"
    fi

    # Bảo đảm plugins không bị ghi đè từ middle_sync
    if [[ -d "$MIDDLE_SYNC_DIR/plugins" ]]; then
        echo "   [i] Bỏ qua sao chép plugins từ middle_sync (plugins được quản lý trực tiếp trong nhánh $MAIN_BRANCH)."
    fi
else
    echo -e "\n[WARN] Không tìm thấy $MIDDLE_SYNC_DIR; bỏ qua đồng bộ middle_sync."
fi

# ------------------------------------------------------------------------------
# BƯỚC 4: KIỂM TRA TRƯỚC DEPLOY (PRE-DEPLOY CHECKS)
# ------------------------------------------------------------------------------
echo -e "\n-> 4. Kiểm tra mã nguồn PHP & cấu hình Web Server trước khi reload..."

# 4.1 Kiểm tra cú pháp PHP (php -l) cho system và plugins
if command -v php >/dev/null 2>&1; then
    echo "   + Đang kiểm tra cú pháp PHP (php -l)..."
    PHP_ERRORS=0
    while IFS= read -r -d '' php_file; do
        if ! php -l "$php_file" >/dev/null 2>&1; then
            echo "   [ERROR] Cú pháp PHP không hợp lệ: $php_file"
            PHP_ERRORS=$((PHP_ERRORS + 1))
        fi
    done < <(find "$BASE_DIR/system" "$BASE_DIR/plugins" -type f -name "*.php" -print0 2>/dev/null)

    if [[ "$PHP_ERRORS" -gt 0 ]]; then
        rollback_deployment "Phát hiện $PHP_ERRORS file PHP có lỗi cú pháp syntax!"
    fi
    echo "   [✓] Cú pháp tất cả file PHP trong system/ và plugins/ đều hợp lệ."
fi

# 4.2 Kiểm tra cấu hình Nginx
if command -v nginx >/dev/null 2>&1; then
    echo "   + Đang kiểm tra cấu hình Nginx (nginx -t)..."
    if [[ "$(id -u)" -eq 0 ]]; then
        if ! nginx -t 2>/dev/null; then
            rollback_deployment "Cấu hình Nginx không hợp lệ (nginx -t thất bại)!"
        fi
        echo "   [✓] Cấu hình Nginx hợp lệ."
    else
        if sudo -n nginx -t >/dev/null 2>&1; then
            echo "   [✓] Cấu hình Nginx hợp lệ (kiểm tra qua sudo)."
        else
            echo "   [INFO] Bỏ qua nginx -t (không có quyền sudo không mật khẩu)."
        fi
    fi
fi

# ------------------------------------------------------------------------------
# BƯỚC 5: XÓA CACHE NAVIGATION VÀ TEMPLATE
# ------------------------------------------------------------------------------
echo -e "\n-> 5. Xóa cache navigation và Twig cache cũ..."
mkdir -p "$BASE_DIR/data/navigation" "$BASE_DIR/cache"
find "$BASE_DIR/data/navigation" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + 2>/dev/null || true
find "$BASE_DIR/cache" -mindepth 1 -maxdepth 1 ! -name 'cyanine-custom.css' -exec rm -rf -- {} + 2>/dev/null || true
echo "   [✓] Đã làm sạch thư mục cache."

# ------------------------------------------------------------------------------
# BƯỚC 6: PHÂN QUYỀN THƯ MỤC GHI DỮ LIỆU
# ------------------------------------------------------------------------------
echo -e "\n-> 6. Kiểm tra & phân quyền thư mục ghi dữ liệu (chmod 775)..."
mkdir -p "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
         "$BASE_DIR/media" "$BASE_DIR/settings"

if id www-data >/dev/null 2>&1; then
    if [[ "$(id -u)" -eq 0 ]]; then
        chown -R www-data:www-data \
            "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
            "$BASE_DIR/media" "$BASE_DIR/settings" 2>/dev/null || true
    else
        if sudo -n true 2>/dev/null; then
            sudo -n chown -R www-data:www-data \
                "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
                "$BASE_DIR/media" "$BASE_DIR/settings" 2>/dev/null || true
        fi
    fi
fi

chmod -R 775 "$BASE_DIR/cache" "$BASE_DIR/content" "$BASE_DIR/data" \
             "$BASE_DIR/media" "$BASE_DIR/settings" 2>/dev/null || true
echo "   [✓] Đã cập nhật quyền truy cập 775."

# ------------------------------------------------------------------------------
# BƯỚC 7: RELOAD DỊCH VỤ PHP-FPM & NGINX
# ------------------------------------------------------------------------------
echo -e "\n-> 7. Reload dịch vụ PHP-FPM & Nginx..."
SYSTEMCTL="$(command -v systemctl 2>/dev/null || echo "")"

if [[ -n "$SYSTEMCTL" && -x "$SYSTEMCTL" ]]; then
    # Tìm dịch vụ PHP-FPM
    PHP_SVC=""
    for svc in php8.4-fpm php8.3-fpm php8.2-fpm php-fpm; do
        if "$SYSTEMCTL" is-active --quiet "$svc" 2>/dev/null; then
            PHP_SVC="$svc"
            break
        fi
    done

    if [[ -n "$PHP_SVC" ]]; then
        echo "   + Đang reload $PHP_SVC..."
        if [[ "$(id -u)" -eq 0 ]]; then
            "$SYSTEMCTL" reload "$PHP_SVC"
        else
            sudo -n "$SYSTEMCTL" reload "$PHP_SVC" 2>/dev/null || true
        fi
        echo "   [✓] $PHP_SVC đã được reload."
    fi

    if "$SYSTEMCTL" is-active --quiet nginx 2>/dev/null; then
        echo "   + Đang reload Nginx..."
        if [[ "$(id -u)" -eq 0 ]]; then
            "$SYSTEMCTL" reload nginx
        else
            sudo -n "$SYSTEMCTL" reload nginx 2>/dev/null || true
        fi
        echo "   [✓] Nginx đã được reload."
    fi
else
    echo "   [INFO] Không tìm thấy systemctl, bỏ qua reload dịch vụ."
fi

# ------------------------------------------------------------------------------
# BƯỚC 8: TÁI TẠO CHỈ MỤC TÌM KIẾM (SEARCH INDEX)
# ------------------------------------------------------------------------------
if [[ -f "$BASE_DIR/scripts/build_search_index.php" ]] && command -v php >/dev/null 2>&1; then
    echo -e "\n-> 8. Tái tạo Search Index cho bài viết..."
    php "$BASE_DIR/scripts/build_search_index.php" || echo "[WARN] Không thể tái tạo search index tự động."
fi

# ------------------------------------------------------------------------------
# BƯỚC 9: CHẠY BỘ TEST KIT KIỂM TRA HỆ THỐNG
# ------------------------------------------------------------------------------
if [[ "$SKIP_TEST" == "true" ]]; then
    echo -e "\n[INFO] Đã bật cờ --skip-test: Bỏ qua kiểm tra Test Kit."
else
    if [[ -f "$BASE_DIR/scripts/test_stage.sh" ]]; then
        echo -e "\n-> 9. Đang chạy bộ Test Kit kiểm tra hệ thống..."
        chmod +x "$BASE_DIR/scripts/"*.sh 2>/dev/null || true
        if ! bash "$BASE_DIR/scripts/test_stage.sh"; then
            rollback_deployment "Bộ Test Kit (test_stage.sh) phát hiện bài kiểm tra không đạt!"
        fi
        echo "   [✓] Tất cả các bài kiểm tra trong Test Kit đều vượt qua thành công."
    fi
fi

# Tắt trap lỗi để in báo cáo an toàn
trap - ERR

# ------------------------------------------------------------------------------
# BƯỚC 10: THỐNG KÊ VÀ BÁO CÁO THAY ĐỔI TRÊN SERVER
# ------------------------------------------------------------------------------
NEW_MAIN_HEAD="$(git -C "$BASE_DIR" rev-parse HEAD 2>/dev/null || echo "")"
NEW_CONTENT_HEAD="$(git -C "$BASE_DIR/content" rev-parse HEAD 2>/dev/null || echo "")"

echo -e "\n=========================================================="
echo "📢 BÁO CÁO THAY ĐỔI SAU KHI DEPLOY (DEPLOYMENT REPORT)"
echo "=========================================================="

HAS_CHANGES=false

# 1. Báo cáo thay đổi trên nhánh chính (v2.x)
if [[ -n "$OLD_MAIN_HEAD" && -n "$NEW_MAIN_HEAD" && "$OLD_MAIN_HEAD" != "$NEW_MAIN_HEAD" ]]; then
    HAS_CHANGES=true
    echo -e "\n📌 MÃ NGUỒN CHÍNH ($MAIN_BRANCH):"
    echo "   Commit: ${OLD_MAIN_HEAD:0:8} -> ${NEW_MAIN_HEAD:0:8}"
    echo "   Danh sách commit mới được áp dụng:"
    git -C "$BASE_DIR" log --oneline --no-merges "$OLD_MAIN_HEAD..$NEW_MAIN_HEAD" | sed 's/^/     • /'
    echo "   Thống kê file thay đổi:"
    git -C "$BASE_DIR" diff --stat "$OLD_MAIN_HEAD" "$NEW_MAIN_HEAD" | sed 's/^/     /'
else
    echo -e "\n📌 MÃ NGUỒN CHÍNH ($MAIN_BRANCH): Đã ở bản mới nhất (${NEW_MAIN_HEAD:0:8}), không có commit mới."
fi

# 2. Báo cáo thay đổi trên nhánh Content
if [[ -n "$OLD_CONTENT_HEAD" && -n "$NEW_CONTENT_HEAD" && "$OLD_CONTENT_HEAD" != "$NEW_CONTENT_HEAD" ]]; then
    HAS_CHANGES=true
    echo -e "\n📌 NỘI DUNG (content):"
    echo "   Commit: ${OLD_CONTENT_HEAD:0:8} -> ${NEW_CONTENT_HEAD:0:8}"
    echo "   Danh sách commit mới được áp dụng:"
    git -C "$BASE_DIR/content" log --oneline --no-merges "$OLD_CONTENT_HEAD..$NEW_CONTENT_HEAD" | sed 's/^/     • /'
    echo "   Thống kê file thay đổi:"
    git -C "$BASE_DIR/content" diff --stat "$OLD_CONTENT_HEAD" "$NEW_CONTENT_HEAD" | sed 's/^/     /'
else
    echo -e "\n📌 NỘI DUNG (content): Đã ở bản mới nhất (${NEW_CONTENT_HEAD:0:8}), không có commit mới."
fi

if [[ "$HAS_CHANGES" == "false" ]]; then
    echo -e "\nℹ️ Hệ thống đã đồng bộ toàn bộ (cả mã nguồn và nội dung), không có thay đổi mới trên server."
else
    echo -e "\n🎉 Đã cập nhật và áp dụng thành công các thay đổi trên vào môi trường chạy!"
fi

echo "=========================================================="
echo "🎉 [DEPLOY HOÀN TẤT] HỆ THỐNG ĐÃ SẴN SÀNG PHỤC VỤ!"
echo "=========================================================="
