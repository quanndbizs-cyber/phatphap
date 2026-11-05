#!/usr/bin/env bash
# ==============================================================================
# Script: pull_tp_update.sh
# Mục đích: Pull / Merge bản cập nhật mới nhất từ Typemill upstream remote `tp`
#           vào nhánh source code hiện tại, đồng thời BỎ QUA và BẢO VỆ tuyệt đối
#           thư mục / submodule `content` để không bao giờ bị conflict hay ghi đè.
#
# Cách sử dụng:
#   ./scripts/pull_tp_update.sh                  # Mặc định lấy từ tp/v2.x
#   ./scripts/pull_tp_update.sh 2.8.1            # Lấy bản tag v2.28.1 (Typemill 2.8.1 / 2.28.1)
#   ./scripts/pull_tp_update.sh v2.28.1          # Chỉ định chính xác tag v2.28.1
#   ./scripts/pull_tp_update.sh tp/v2.x          # Chỉ định nhánh tp/v2.x
#   ./scripts/pull_tp_update.sh --no-commit      # Merge & resolve content nhưng chưa commit để review
# ==============================================================================

set -e

# Màu sắc console
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/config.sh"
cd "$BASE_DIR"

REMOTE_NAME="tp"
UPSTREAM_URL="https://github.com/typemill/typemill.git"
DEFAULT_TARGET="tp/v2.x"
TARGET_REF=""
AUTO_COMMIT=true

# Parse tham số
while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-commit)
            AUTO_COMMIT=false
            shift
            ;;
        -h|--help)
            echo -e "${BOLD}Hướng dẫn sử dụng:${NC} $0 [TARGET_REF] [--no-commit]"
            echo ""
            echo "Ví dụ:"
            echo "  $0                  # Cập nhật từ tp/v2.x (bản mới nhất)"
            echo "  $0 2.8.1            # Cập nhật từ Typemill 2.8.1 (tag v2.28.1)"
            echo "  $0 v2.28.1          # Cập nhật từ tag v2.28.1"
            echo "  $0 --no-commit      # Merge source, giữ nguyên content, dừng trước khi commit"
            exit 0
            ;;
        *)
            TARGET_REF="$1"
            shift
            ;;
    esac
done

echo -e "${CYAN}${BOLD}=== TYPEMILL SOURCE UPDATER (EXCLUDE CONTENT) ===${NC}\n"

# 1. Kiểm tra Git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo -e "${RED}[LỖI] Thư mục hiện tại không phải là Git repository!${NC}"
    exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo -e "${BLUE}* Nhánh hiện tại:${NC} ${BOLD}${CURRENT_BRANCH}${NC}"

# 2. Kiểm tra & cấu hình remote 'tp'
if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}* Chưa tìm thấy remote '${REMOTE_NAME}'. Đang tự động thêm remote upstream...${NC}"
    git remote add "$REMOTE_NAME" "$UPSTREAM_URL"
    echo -e "${GREEN}  -> Đã thêm remote ${REMOTE_NAME} (${UPSTREAM_URL})${NC}"
else
    echo -e "${GREEN}* Đã tìm thấy remote '${REMOTE_NAME}':${NC} $(git remote get-url "$REMOTE_NAME")"
fi

# 3. Fetch dữ liệu mới nhất từ remote tp
echo -e "${BLUE}* Đang fetch tags & nhánh mới nhất từ '${REMOTE_NAME}'...${NC}"
git fetch "$REMOTE_NAME" --tags --prune

# 4. Xác định TARGET_REF
if [[ -z "$TARGET_REF" ]]; then
    TARGET_REF="$DEFAULT_TARGET"
fi

# Chuẩn hoá các dạng viết phiên bản phổ biến (vd: 2.8.1 -> v2.28.1 hoặc v2.8.1)
RESOLVED_REF=""
CANDIDATES=(
    "$TARGET_REF"
    "v$TARGET_REF"
    "v2.${TARGET_REF#2.}"
    "v2.2${TARGET_REF#2.}"
)

# Nếu user nhập dạng 2.8.1, ưu tiên map sang v2.28.1 (Typemill versioning scheme)
if [[ "$TARGET_REF" == "2.8.1" || "$TARGET_REF" == "v2.8.1" ]]; then
    CANDIDATES=("v2.28.1" "${CANDIDATES[@]}")
fi

for cand in "${CANDIDATES[@]}"; do
    if git rev-parse --verify --quiet "$cand" >/dev/null 2>&1; then
        RESOLVED_REF="$cand"
        break
    fi
    if git rev-parse --verify --quiet "${REMOTE_NAME}/$cand" >/dev/null 2>&1; then
        RESOLVED_REF="${REMOTE_NAME}/$cand"
        break
    fi
done

if [[ -z "$RESOLVED_REF" ]]; then
    echo -e "${RED}[LỖI] Không tìm thấy ref/tag/nhánh '${TARGET_REF}' trong repository hoặc remote '${REMOTE_NAME}'!${NC}"
    echo -e "Các tag Typemill gần đây có sẵn:"
    git tag -l "v2.*" | tail -n 10
    exit 1
fi

RESOLVED_COMMIT="$(git rev-parse "$RESOLVED_REF")"
echo -e "${GREEN}* Mục tiêu update:${NC} ${BOLD}${RESOLVED_REF}${NC} (${RESOLVED_COMMIT:0:8})"

# 5. Lưu lại commit hash hiện tại của submodule content (nếu có)
ORIG_CONTENT_SHA=""
if git ls-tree HEAD content >/dev/null 2>&1; then
    ORIG_CONTENT_SHA="$(git rev-parse HEAD:content 2>/dev/null || echo "")"
    if [[ -n "$ORIG_CONTENT_SHA" ]]; then
        echo -e "${BLUE}* Commit hash của submodule content hiện tại:${NC} ${ORIG_CONTENT_SHA:0:8}"
    fi
fi

# 6. Kiểm tra xem working tree có dirty không (bỏ qua submodule content)
# Cấu hình bỏ qua dirty status của submodule content tạm thời
git config submodule.content.ignore all

DIRTY_FILES="$(git status --porcelain -uno --ignore-submodules=all)"
if [[ -n "$DIRTY_FILES" ]]; then
    echo -e "${RED}[CẢNH BÁO] Working tree đang có file mã nguồn chưa commit:${NC}"
    echo "$DIRTY_FILES"
    echo -e "${YELLOW}Vui lòng commit hoặc 'git stash' các thay đổi trên trước khi chạy script update!${NC}"
    exit 1
fi

# 7. Kiểm tra xem có gì mới cần merge không
MERGE_BASE="$(git merge-base HEAD "$RESOLVED_REF")"
if [[ "$MERGE_BASE" == "$RESOLVED_COMMIT" ]]; then
    echo -e "${GREEN}${BOLD}Nhánh hiện tại đã có đầy đủ commit từ ${RESOLVED_REF}. Không có gì cần cập nhật!${NC}"
    exit 0
fi

echo -e "\n${BLUE}* Bắt đầu merge từ ${RESOLVED_REF} (bảo lưu content)...${NC}"

# 8. Thực hiện merge với flag --no-commit
set +e
git merge --no-commit --no-ff "$RESOLVED_REF" >/tmp/tp_merge.log 2>&1
MERGE_STATUS=$?
set -e

# 9. Xử lý conflict ở thư mục / submodule content
echo -e "${BLUE}* Tự động giải quyết conflict thư mục content (giữ nguyên content hiện tại)...${NC}"

# Xoá các file content phát sinh từ upstream ra khỏi index
git rm -rf --ignore-unmatch content/ >/dev/null 2>&1 || true
git rm -rf --ignore-unmatch 'content~*' >/dev/null 2>&1 || true
rm -rf content~* 2>/dev/null || true

# Khôi phục submodule content và .gitmodules từ HEAD
git reset HEAD -- content .gitmodules >/dev/null 2>&1 || true
git checkout HEAD -- content .gitmodules >/dev/null 2>&1 || true

# Nếu content là submodule, đảm bảo git index ghi nhận đúng commit hash ban đầu
if [[ -n "$ORIG_CONTENT_SHA" ]]; then
    git update-index --cacheinfo 160000,"$ORIG_CONTENT_SHA",content 2>/dev/null || true
fi

# 10. Kiểm tra xem còn file conflict nào NGOÀI content không
UNMERGED_FILES="$(git diff --name-only --diff-filter=U 2>/dev/null || true)"
if [[ -n "$UNMERGED_FILES" ]]; then
    echo -e "\n${RED}${BOLD}[CẦN XỬ LÝ CONFLICT THỦ CÔNG]${NC}"
    echo -e "${YELLOW}Có conflict ở các file mã nguồn ngoài content sau:${NC}"
    echo "$UNMERGED_FILES"
    echo -e "\n${YELLOW}Hướng dẫn:${NC}"
    echo "  1. Mở các file trên để sửa conflict."
    echo "  2. Chạy: git add <các file đã sửa>"
    echo "  3. Chạy: git commit -m \"chore: update Typemill source from ${RESOLVED_REF}\""
    exit 1
fi

# 11. Kiểm tra xem có thay đổi nào được stage không
if git diff --cached --quiet; then
    echo -e "${YELLOW}Không có file mã nguồn nào thay đổi giữa HEAD và ${RESOLVED_REF}.${NC}"
    git merge --abort >/dev/null 2>&1 || true
    exit 0
fi

# 12. Commit hoặc dừng lại theo tuỳ chọn
echo -e "\n${GREEN}=== CÁC FILE MÃ NGUỒN ĐÃ ĐƯỢC CẬP NHẬT (STAGE) ===${NC}"
git diff --cached --stat

if [[ "$AUTO_COMMIT" == "false" ]]; then
    echo -e "\n${YELLOW}Đã thực hiện merge thành công với cờ --no-commit.${NC}"
    echo "Bạn có thể kiểm tra 'git status' / 'git diff --cached' rồi tự gõ: git commit"
    exit 0
fi

COMMIT_MSG="chore: update Typemill source from ${RESOLVED_REF} (preserve content submodule)"
git commit -m "$COMMIT_MSG" >/dev/null

NEW_HEAD="$(git rev-parse --short HEAD)"
echo -e "\n${GREEN}${BOLD}✔ CẬP NHẬT THÀNH CÔNG!${NC}"
echo -e "Commit mới: ${BOLD}${NEW_HEAD}${NC} - ${COMMIT_MSG}"
echo -e "Thư mục ${BOLD}content${NC} hoàn toàn nguyên vẹn, không bị ảnh hưởng."

# 13. Kiểm tra các thay đổi liên quan đến dependencies
if git diff --name-only HEAD~1 HEAD | grep -q "composer.lock\|composer.json"; then
    echo -e "\n${YELLOW}ℹ Lưu ý: composer.json/composer.lock có thay đổi.${NC}"
    echo -e "  Nếu cần, hãy chạy: ${BOLD}composer install --no-dev --optimize-autoloader${NC}"
fi

if git diff --name-only HEAD~1 HEAD | grep -q "package.json\|package-lock.json"; then
    echo -e "\n${YELLOW}ℹ Lưu ý: package.json có thay đổi.${NC}"
    echo -e "  Nếu cần, hãy chạy: ${BOLD}npm install${NC}"
fi

echo -e "\n${BLUE}Bước tiếp theo:${NC}"
echo -e "  - Kiểm tra ứng dụng trên trình duyệt."
echo -e "  - Đẩy lên repository của bạn: ${BOLD}git push origin ${CURRENT_BRANCH}${NC}\n"
