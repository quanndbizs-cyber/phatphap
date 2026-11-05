#!/bin/bash
# ==============================================================================
# Script: sync_to_middle.sh
# Mục đích: [Dành cho Dev Localhost] 1-Click duy nhất để:
#           1. Tự động đồng bộ các tài nguyên chung (media, plugins)
#              vào thư mục trung gian content/middle_sync/ (KHÔNG gồm settings)
#           2. Tự động kiểm tra thay đổi trong thư mục content (bài viết, media, plugins...)
#           3. Tự động git add, git commit và git push lên GitHub nhánh 'content'
#
# Cách sử dụng:
#   ./scripts/sync_to_middle.sh
#   ./scripts/sync_to_middle.sh -m "Cập nhật bài viết mới và audio"
# ==============================================================================

set -e

# Màu sắc thông báo
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/config.sh"
cd "$BASE_DIR"

PROD_FLAG=""
CUSTOM_MSG=""

# Phân tích tham số dòng lệnh
while [[ $# -gt 0 ]]; do
    case "$1" in
        --prod)
            PROD_FLAG="--prod"
            shift
            ;;
        -m|--message)
            CUSTOM_MSG="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

echo -e "${BLUE}==================================================================${NC}"
echo -e "${CYAN}🔄 [DEV LOCAL] 1-CLICK ĐỒNG BỘ LOCAL -> MIDDLE_SYNC -> GIT CONTENT${NC}"
echo -e "${BLUE}==================================================================${NC}"

# BƯỚC 1: ĐỒNG BỘ TỪ LOCAL VÀO CONTENT/MIDDLE_SYNC
echo -e "\n${YELLOW}-> BƯỚC 1: Đang sao chép settings, media, plugins vào content/middle_sync/...${NC}"
"$BASE_DIR/scripts/pack_middle_sync.sh" $PROD_FLAG

# BƯỚC 2: KIỂM TRA THAY ĐỔI TRONG CONTENT WORKTREE
echo -e "\n${YELLOW}-> BƯỚC 2: Kiểm tra trạng thái Git trong thư mục content/...${NC}"
cd "$BASE_DIR/content"

# Stage tất cả các thay đổi (bao gồm bài viết mới, ảnh mới và middle_sync)
git add -A

CHANGES=$(git status --porcelain)

if [ -z "$CHANGES" ]; then
    echo -e "${GREEN}✓ Mọi dữ liệu đã ở trạng thái mới nhất. Không có thay đổi nào cần commit.${NC}"
else
    echo -e "${CYAN}Các tệp tin có thay đổi chuẩn bị commit:${NC}"
    git status -s

    # Tạo commit message
    if [ -n "$CUSTOM_MSG" ]; then
        COMMIT_MSG="$CUSTOM_MSG"
    else
        COMMIT_MSG="sync(content): update articles and middle_sync [$(date '+%Y-%m-%d %H:%M:%S')]"
    fi

    # BƯỚC 3: COMMIT VÀO NHÁNH CONTENT
    echo -e "\n${YELLOW}-> BƯỚC 3: Đang commit vào nhánh 'content'...${NC}"
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✓ Đã tạo commit thành công:${NC} $COMMIT_MSG"

    # BƯỚC 4: PUSH LÊN GITHUB
    echo -e "\n${YELLOW}-> BƯỚC 4: Đang đẩy lên GitHub (origin content)...${NC}"
    if git push origin content; then
        echo -e "${GREEN}==================================================================${NC}"
        echo -e "${GREEN}🎉 ĐỒNG BỘ VÀ PUSH LÊN GITHUB THÀNH CÔNG!${NC}"
        echo -e "   Nhánh   : content"
        echo -e "   Commit  : $COMMIT_MSG"
        echo -e "   Server deploy bây giờ đã sẵn sàng để pull về."
        echo -e "${GREEN}==================================================================${NC}"
    else
        echo -e "${RED}⚠️  Không thể tự động push lên GitHub (kiểm tra kết nối mạng/credentials).${NC}"
        echo -e "   Bạn có thể tự chạy lệnh: ${CYAN}cd $BASE_DIR/content && git push origin content${NC}"
    fi
fi

cd "$BASE_DIR"
