---
name: Project Governance, 2-Branch Git Architecture & Content Publishing Rules
description: Mandatory rules for separating Software (v2.x branch) vs Content (content branch), strict selective Git commits, completion reporting, and automated Markdown/YAML content publishing in Typemill.
---

# Quy Tắc Quản Trị Dự Án & Xuất Bản Nội Dung (Project Governance)

Bộ quy tắc này là **bắt buộc (Non-Negotiable)** đối với mọi AI Agent khi làm việc trên dự án này.

---

## 1. Kiến trúc Phân tách Software vs. Content (2 Nhánh Git Độc Lập)

Dự án được thiết kế để trở thành một **Nền tảng Web Đa Mục Đích (Multi-Purpose Web Platform)** có thể tái sử dụng cho nhiều dự án khác nhau (Thư viện Phật Pháp, Web Shop giới thiệu sản phẩm, Trang công thức nấu ăn, Sách tài liệu...). Do đó, phần mềm (Software) và nội dung (Content) phải tách biệt tuyệt đối:

### 1.1. Nhánh `v2.x` (Main Stream — SOFTWARE / PLATFORM)
* **Thư mục làm việc**: Thư mục gốc `/var/www/html/phatphap`
* **Phạm vi quản lý**:
  * `system/` — Lõi Typemill (Upstream từ remote `tp` — **Tuyệt đối không sửa đổi để thêm tính năng mới**, chỉ cập nhật từ `tp`).
  * `plugins/` — Các plugin mở rộng tính năng (ví dụ: `plugins/mediaplayer` hỗ trợ Audiobookshelf, Audio.com, YouTube, MP3 Playlist, Accordion...).
  * `themes/` — Giao diện hiển thị (Twig, CSS, JS).
  * `scripts/` — Công cụ hệ thống, mạng WSL, triển khai.
  * `.agent/rules/`, `.opencode/skills/` — Bộ quy tắc điều khiển AI Agent.
* **Nguyên tắc vàng**: Không bao giờ hardcode dữ liệu bài viết cụ thể vào `plugins/` hoặc `themes/`. Thư mục `content/*` được ignore trên nhánh `v2.x` để nhánh này luôn là **Base Platform sạch 100%** khi clone sang dự án mới.

### 1.2. Nhánh `content` (Dedicated Branch — CONTENT & DATA)
* **Thư mục làm việc**: `/var/www/html/phatphap/content` (được gắn trực tiếp vào nhánh `content` của repo `origin` thông qua Git Worktree / Nested Git).
* **Phạm vi quản lý**:
  * Toàn bộ cây thư mục chuyên mục (`01-phat-giao/`, `02-nhan-qua/`, `03-giao-duc/`, `04-thong-bao/`...)
  * Các cặp file nội dung `XX-slug.md` (hoặc `.txt` khi đang nháp) và metadata `XX-slug.yaml`.

---

## 2. Quy Tắc Git Nghiêm Ngặt (Strict Git & Reporting Rules)

Khi thực hiện bất kỳ thao tác Git nào, Agent **BẮT BUỘC** tuân thủ:

1. **CẤM dùng `git add .` hoặc `git add -A`**:
   * Chỉ được phép stage đích danh từng file vừa được thêm mới hoặc chỉnh sửa trong phạm vi task: `git add <path/to/file1> <path/to/file2>`.
   * Tuyệt đối không đưa vào commit:
     * Các file không thuộc phạm vi chỉnh sửa của task hiện tại.
     * Các thư mục tham khảo ngoài luồng (`TypeMills/`, `log/`, `cache/`, `data/`).
     * Các file chứa thông tin nhạy cảm (`settings/secrets.yaml`, `settings/users/`, `settings/settings.yaml`).
     * Các file bị báo `modified` ảo do lệch chuẩn xuống dòng `CRLF` giữa Windows và WSL.
2. **Commit đúng nhánh**:
   * Thay đổi phần mềm (`plugins/`, `themes/`, `scripts/`, `.agent/`, `.gitignore`) -> Commit tại `/var/www/html/phatphap` trên nhánh **`v2.x`** với tiền tố `feat(platform): ...`, `fix(plugin): ...`, `chore(env): ...`.
   * Thay đổi nội dung bài viết (`content/*`) -> Commit tại `/var/www/html/phatphap/content` trên nhánh **`content`** với tiền tố `content(<chuyên-mục>): ...`.
3. **Báo cáo bắt buộc sau mỗi lần Hoàn thành & Commit**:
   Sau mỗi khi hoàn thành task và commit, Agent phải trình bày báo cáo gồm 4 mục rõ ràng:
   * **✅ Đã hoàn thành (Done)**: Liệt kê các tính năng/bài viết đã xử lý và kiểm thử xong.
   * **⏳ Chưa hoàn thành / Kế tiếp (Pending)**: Những hạng mục còn lại hoặc hướng mở rộng tiếp theo.
   * **📦 Thông tin Commit**: Nhánh Git, mã hash Commit, thông điệp Commit và danh sách chính xác các file nằm trong Commit.
   * **🛡️ Các file giữ ngoài Commit (Excluded/Untracked)**: Liệt kê các file không đưa vào commit để người dùng kiểm soát minh bạch.

---

## 3. Quy Trình AI Agent Hỗ Trợ Đưa Nội Dung Lên Hệ Thống (Content Publishing Workflow)

Khi người dùng cung cấp nội dung mới (dưới dạng file `.html`, `.md`, `.docx`, văn bản copy-paste, hoặc danh sách link `audiobookshelf`, `audio.com`, `youtube`, `mp3`), Agent thực hiện theo quy trình 4 bước:

### Bước 1: Xác định vị trí & thứ tự trong cây thư mục `content/`
* Cấu trúc chuẩn hiện tại:
  * `01-phat-giao/` — Phật Giáo & Chánh Pháp (Kinh sách, Pháp âm, Khai thị, Thiền định)
  * `02-nhan-qua/` — Câu Chuyện Nhân Quả & Đạo Lý (Truyện đọc, Tuyển tập Audio Báo Ứng Hiện Đời)
  * `03-giao-duc/` — Khoa Học & Giáo Dục (AI, Công nghệ, Ngoại ngữ, Kỹ năng học tập)
  * `04-thong-bao/` — Thông Báo & Tin Mới
* Đặt tên file theo quy tắc `XX-slug-khong-dau.md` và `XX-slug-khong-dau.yaml` (ví dụ: `01-de-tu-quy.md` & `01-de-tu-quy.yaml`).

### Bước 2: Chuyển đổi sang Markdown chuẩn + Shortcode của `plugins/mediaplayer`
* Không bao giờ để file `.html` thô trong `content/` (vì Typemill chỉ đọc `.md` và `.yaml`).
* Sử dụng các Shortcode của plugin `mediaplayer` cho nội dung đa phương tiện:
  * **Nhúng đơn lẻ (Audiobookshelf / Audio.com / YouTube)**:
    ```markdown
    [:embed url="https://qts-home.duckdns.org/audiobookshelf/share/..." height="680px" title="Tiêu đề" :]
    ```
  * **Trình phát Đa nguồn có Sidebar danh mục (Dual-pane Media Hub)**:
    Đặt danh sách phát trong metadata YAML của trang (`meta.yaml` -> `custom.playlist`) hoặc dùng shortcode:
    ```markdown
    [:mediahub id="main" height="680px" :]
    ```
  * **Danh sách bài nghe tra cứu nhanh (Tracklist)**:
    ```markdown
    [:tracklist id="tracks" base="https://audio.com/quan-nguyen-duc-1/audio/" :]
    ```
  * **Khối đóng/mở chương mục (Accordion)**:
    ```markdown
    [:accordion title="Chương I: ..." open="true" :]
    Nội dung chương...
    [:/accordion:]
    ```

### Bước 3: Tạo file Metadata `.yaml` đầy đủ
Mỗi file `XX-slug.md` bắt buộc phải có file `XX-slug.yaml` đi kèm với cấu trúc:
```yaml
meta:
  title: 'Tiêu đề bài viết'
  description: 'Tóm tắt ngắn gọn nội dung bài viết hiển thị trên thẻ Card và SEO'
  owner: quannd
  author: 'Tên tác giả / Pháp sư'
  created: '2026-11-01'
  modified: '2026-11-01'
  time: '21-00-00'
  navtitle: 'Tên ngắn gọn trên Menu'
```

### Bước 4: Làm mới bộ đệm Điều hướng (Navigation Cache) & Kiểm thử
* Sau khi thêm/sửa/xóa bất kỳ file nào trong `content/`, xóa các file cache trong `/var/www/html/phatphap/data/navigation/*` để Typemill tự động quét lại cây thư mục ngay lập tức.
* Kiểm tra URL bài viết bằng `curl -I http://localhost/phatphap/<chuyen-muc>/<slug>` đảm bảo trả về `HTTP 200 OK`.
