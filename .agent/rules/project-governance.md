---
name: Project Governance, 2-Branch Git Architecture & Content Publishing Rules
description: Mandatory rules for separating Software (v2.x branch) vs Content (content branch), strict selective Git commits, completion reporting, automated Markdown/YAML content publishing in Typemill, and scripts/deployment governance.
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

## 3. Quy Trình AI Agent Hỗ Trợ Đưa Nội Dung Lên Hệ Thống Từ Thư Mục `Source/` & Vòng Đời Dữ Liệu

Thư mục **`/var/www/html/phatphap/Source/`** là **Cổng tiếp nhận nội dung đầu vào chính thức (Official Raw Content Intake Directory)**.

### 3.1. Vòng đời dữ liệu nguồn (Data Lifecycle & Archival Workflow)
Để đảm bảo dữ liệu nguồn luôn gọn gàng, tránh thất lạc hoặc xử lý trùng lặp, quy trình luân chuyển dữ liệu nguồn gồm 3 giai đoạn:
1. **Tiếp nhận (`Source/`)**:
   * Người dùng đặt các bản thảo thô (`.md`, `.html`, `.pdf`, `.docx`, bản xuất ChatGPT, danh sách link audio/video...) vào các thư mục con trong `Source/` (ví dụ: `Source/Bao ung hien doi/`, `Source/Tu học/`...).
2. **Chờ xác nhận nghiệm thu (`Source/finish_confirm/`)**:
   * Ngay sau khi Agent hoàn tất biên tập đưa nội dung lên `content/` và tài liệu lên `media/files/`, Agent di chuyển (move) toàn bộ dữ liệu nguồn tương ứng vào thư mục chờ xác nhận: `/var/www/html/phatphap/Source/finish_confirm/<Tên_thư_mục_nguồn>/`.
   * Trạng thái này giúp người dùng dễ dàng kiểm tra đối chiếu dữ liệu nào đã được Agent đưa lên web và dữ liệu nào còn đang chờ xử lý trong `Source/`.
3. **Lưu trữ hoàn tất (`/finish/`)**:
   * Khi người dùng đã kiểm tra và xác nhận nội dung trên web đạt yêu cầu, dữ liệu từ `Source/finish_confirm/` được chuyển dứt điểm vào thư mục lưu trữ vĩnh viễn ở root dự án: `/var/www/html/phatphap/finish/<Tên_thư_mục_nguồn>/`.
4. **Quy tắc Git**:
   * Cả thư mục `Source/` (bao gồm `Source/finish_confirm/`) và `/finish/` đều được loại trừ trong `.gitignore` của nhánh `v2.x` để giữ nhánh mã nguồn sạch sẽ tuyệt đối.

### 3.2. Các bước biên tập và xuất bản lên hệ thống
Khi người dùng cung cấp nội dung mới trong `Source/` (dưới dạng file `.html`, `.md`, `.docx`, văn bản copy-paste, hoặc danh sách link `audiobookshelf`, `audio.com`, `youtube`, `mp3`), Agent thực hiện theo quy trình 4 bước:

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

---

## 4. Quy Tắc Quản Trị Scripts & Tự Động Hóa Triển Khai (Scripts & Deployment Governance)

Mọi thao tác phát triển, bảo trì và thực thi các script trong thư mục `scripts/` bắt buộc tuân thủ 5 nguyên tắc:

### 4.1. Tuyệt đối không hardcode đường dẫn và thông tin máy chủ
* Toàn bộ các script `.sh`, `.py`, `.php` không được ghi cứng đường dẫn thư mục cài đặt (`/var/www/html/phatphap`, `/mnt/d/...`), IP máy chủ (`192.168.1.22`), cổng SSH (`22`), hoặc tên tài khoản (`quannd`).
* Bắt buộc sử dụng cơ chế nạp cấu hình tập trung:
  * Nạp `source "$(dirname "${BASH_SOURCE[0]}")/config.sh"`.
  * Cấu hình lưu trữ tại `scripts/deploy.env` (tạo từ file mẫu `scripts/deploy.env.example`).
  * Cho phép người dùng ghi đè (override) linh hoạt qua biến môi trường dòng lệnh hoặc CLI flag (`--host`, `--port`, `--user`, `--key`, `--path`).

### 4.2. Bảo vệ kiến trúc 2 Git Repository Độc Lập
* Thư mục `content/` là một Git repository độc lập (nhánh `content`), hoàn toàn tách rời khỏi Web root (`v2.x`).
* **CẤM** tạo lại Git Submodule (tuyệt đối không tạo file `.gitmodules` hay commit hash con trỏ submodule trong nhánh `v2.x`).
* Thư mục `content/` bắt buộc nằm trong `.gitignore` của Web root (`v2.x`).
* Khi nâng cấp lõi Typemill upstream bằng `scripts/pull_tp_update.sh`, script phải tự động loại trừ và bảo vệ nguyên vẹn thư mục `content/` độc lập.

### 4.3. Bắt buộc đồng bộ tài liệu hướng dẫn (`scripts/README.md`)
* Mỗi khi thêm mới, xóa bỏ script, đổi tên file hoặc thay đổi logic/tham số dòng lệnh (flags), Agent **BẮT BUỘC** phải cập nhật đồng bộ ngay vào `scripts/README.md`.
* `scripts/README.md` là nguồn chân lý duy nhất (Single Source of Truth) cho lập trình viên và AI Agent khi vận hành hệ thống kịch bản.

### 4.4. Cơ chế Force Pull & xử lý phân kỳ an toàn
* Các quy trình triển khai (`remote_one_click_deploy.sh`, `deploy_server.sh`) bắt buộc hỗ trợ cờ `--force` (hoặc `-f`).
* Khi remote GitHub có commit bị forced push hoặc rebase dẫn đến phân kỳ (`hint: Diverging branches can't be fast-forwarded`), script phải tự động chuyển sang `git reset --hard` về commit mới nhất từ remote tracking branch tương ứng (`remotes/origin/<branch>`), không để quy trình deploy bị dừng lại.

### 4.5. An toàn cấu hình & bảo mật thông tin
* Cấu hình giao diện chung của website được đồng bộ an toàn qua `content/middle_sync/settings/settings.yaml`.
* **TUYỆT ĐỐI CẤM** đưa các file nhạy cảm (`settings/secrets.yaml`, `settings/users/`, private keys, certificates) vào `middle_sync/` hay commit lên Git.
