---
name: Project Governance, 2-Branch Git Architecture & Content Publishing Rules
description: Mandatory rules for separating Software (v2.x branch) vs Content (content branch), strict selective Git commits, completion reporting, and automated Markdown/YAML content publishing in Typemill.
---

# Quy Tắc Quản Trị Dự Án & Xuất Bản Nội Dung (Project Governance)

*(Tài liệu đồng bộ từ `.agent/rules/project-governance.md`)*

1. **Kiến trúc 2 Nhánh Git Độc Lập**:
   - **Nhánh `v2.x` (Tại `/var/www/html/phatphap`)**: Chỉ chứa Software/Platform (`system/`, `plugins/`, `themes/`, `scripts/`, `.agent/`, `.opencode/`). Ignore `content/*` để làm Base Platform tái sử dụng cho nhiều dự án.
   - **Nhánh `content` (Tại `/var/www/html/phatphap/content`)**: Chỉ chứa dữ liệu bài viết `.md` và `.yaml` của dự án.
2. **Quy tắc Git nghiêm ngặt**:
   - CẤM dùng `git add .` hoặc `git add -A`. Chỉ `git add <file>` đích danh những file thuộc phạm vi task.
   - Không commit file ngoài phạm vi chỉnh sửa, thư mục `TypeMills/`, `log/`, `settings/secrets.yaml`, `settings/users/`.
   - Luôn báo cáo rõ 4 mục sau mỗi lần commit: (1) Đã xong, (2) Chưa xong, (3) Nhánh + Mã Commit + File trong commit, (4) File giữ ngoài commit.
3. **Quy trình Xuất bản Nội dung**:
   - Mọi nội dung (`.html`, `.md`, `.docx`, link `audiobookshelf`, `audio.com`, `youtube`) phải chuyển thành cặp `XX-slug.md` + `XX-slug.yaml` trong `content/` và sử dụng Shortcode của `plugins/mediaplayer` (`[:mediahub:]`, `[:embed:]`, `[:tracklist:]`, `[:accordion:]`), sau đó xóa cache `data/navigation/*`.
