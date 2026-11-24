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

1. **BẮT BUỘC LUÔN LẤY GIT MỚI NHẤT TRƯỚC KHI SỬA (`Always Pull Latest Git Before Editing`)**:
   * Trước khi bắt đầu đọc phân tích sâu hoặc chỉnh sửa bất kỳ file nào trong một phiên làm việc / yêu cầu mới, Agent **BẮT BUỘC** phải chạy lệnh lấy code mới nhất từ upstream (`https://github.com/quanndbizs-cyber/phatphap.git`) và đồng bộ fast-forward/rebase cho **cả 2 nhánh độc lập**:
     * Nhánh `v2.x` tại thư mục gốc (`git fetch` + `git merge --ff-only` hoặc `git pull --rebase` từ `origin/v2.x`).
     * Nhánh `content` tại thư mục `content/` (`git fetch` + `git merge --ff-only` hoặc `git pull --rebase` từ `origin/content`).
   * Tuyệt đối không sửa code trên nền commit cũ chưa cập nhật để phòng tránh hoàn toàn xung đột (Merge Conflict) khi tạo PR hoặc merge.
2. **CẤM dùng `git add .` hoặc `git add -A`**:
   * Chỉ được phép stage đích danh từng file vừa được thêm mới hoặc chỉnh sửa trong phạm vi task: `git add <path/to/file1> <path/to/file2>`.
   * Tuyệt đối không đưa vào commit:
     * Các file không thuộc phạm vi chỉnh sửa của task hiện tại.
     * Các thư mục tham khảo ngoài luồng (`TypeMills/`, `log/`, `cache/`, `data/`).
     * Các file chứa thông tin nhạy cảm (`settings/secrets.yaml`, `settings/users/`, `settings/settings.yaml`).
     * Các file bị báo `modified` ảo do lệch chuẩn xuống dòng `CRLF` giữa Windows và WSL.
3. **Commit đúng nhánh**:
   * Thay đổi phần mềm (`plugins/`, `themes/`, `scripts/`, `.agent/`, `.gitignore`) -> Commit tại `/var/www/html/phatphap` trên nhánh **`v2.x`** với tiền tố `feat(platform): ...`, `fix(plugin): ...`, `chore(env): ...`.
   * Thay đổi nội dung bài viết (`content/*`) -> Commit tại `/var/www/html/phatphap/content` trên nhánh **`content`** với tiền tố `content(<chuyên-mục>): ...`.
4. **Báo cáo bắt buộc sau mỗi lần Hoàn thành & Commit**:
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

### 3.3. Quy tắc Định dạng Markdown Thuần & CẤM Chèn Thẻ HTML / Mã Anchor Giả (Markdown Purity Rule)
* **Bối cảnh kỹ thuật**: Parser Markdown của Typemill (`Parsedown`) chạy ở chế độ an toàn nghiêm ngặt (`SafeMode=true`, `system/typemill/Models/Content.php:178`). Khi gặp bất kỳ thẻ HTML thô nào (`<div>`, `<p>`, `<span>`, `<section>`, `<style>`...), parser sẽ tự động escape toàn bộ thành ký tự thực thể (`&lt;div...&gt;`), làm lộ mã nguồn HTML dạng văn bản thô trực tiếp trên giao diện website người dùng nhìn thấy. Ngoài ra, Typemill tự động tạo anchor link chuẩn cho mọi tiêu đề bài viết dựa trên slug.
* **Quy tắc tuyệt đối**:
  1. **CẤM đưa trực tiếp các thẻ HTML thô** (`<div>`, `<span>`, `<p>`, v.v.) vào các file `.md` hiển thị trên web.
  2. **CẤM đưa mã anchor giả / thuộc tính thủ công dạng `{ #slug }`** vào tiêu đề Markdown (`## Tiêu đề { #anchor }`) hoặc tiêu đề YAML (`title: '... { #anchor }'`). Typemill đã tự động tạo anchor slug chuẩn cho mọi tiêu đề (`[#](#slug)`). Việc ghi `{ #... }` sẽ khiến hệ thống không nhận diện được và hiển thị thành văn bản thô (raw code) xấu xí trên trang web.
  3. **Trường hợp ngoại lệ duy nhất**: Các khối mã nguồn raw code được bao bọc rõ ràng trong code fence (ví dụ: ` ```html ... ``` `) dùng để hướng dẫn kỹ thuật hoặc hiển thị code mẫu cho người đọc, KHÔNG phải để render giao diện.
  4. **Giải pháp định dạng khối / thẻ thông tin (Info Cards / Callouts)**:
     - Dùng Markdown Blockquote (`> ...`) kết hợp định dạng Markdown chuẩn (`**In đậm**`, `*In nghiêng*`, liên kết `[text](url)`).
     - Dùng các kiểu Notice chuẩn của Typemill (`! `, `!! `, `!!! `) hoặc shortcodes đã được đăng ký và hỗ trợ bởi plugin/theme.

### 3.4. Quy tắc Phân Loại Định Dạng Chữ Hoa Đầu Bài (Drop-cap Scoping Rule)
* **Mục đích**: Drop-cap (chữ hoa khổ lớn nghệ thuật ở đầu bài/đoạn) tạo nét trang nghiêm, cổ kính đặc thù cho các bài Kinh điển và Câu chuyện Nhân Quả/Đạo lý. Tuy nhiên, các văn bản hành chính, thông báo, tài liệu học tập, giáo dục hoặc khoa học nếu áp dụng drop-cap sẽ làm mất tính chuyên nghiệp hoặc gây rối mắt.
* **Quy tắc phân loại và cấu hình**:
  1. **Mặc định theo chuyên mục (Category-based default)**:
     - Mặc định chỉ bật Drop-cap (`td-dropcap-enabled`) cho các bài viết thuộc chuyên mục **Kinh Điển & Câu Chuyện** (ví dụ: `02-nhan-qua/` / `nhan-qua`, `01-phat-giao/` / `phat-giao`).
     - Tất cả các bài viết thuộc các chuyên mục khác (ví dụ: `03-giao-duc/`, `04-thong-bao/`...) mặc định hiển thị bình thường (**không bật drop-cap**).
  2. **Cấu hình danh mục linh hoạt (Theme Configuration)**:
     - Có thể cấu hình danh sách category bật drop-cap thông qua `settings.dropcap_categories` trong `themes/tinhdo/tinhdo.yaml` (hoặc qua giao diện quản trị Admin của Typemill).
  3. **Ghi đè cấp bài viết (Page Metadata Override)**:
     - Nếu một bài viết cụ thể cần bật hoặc tắt drop-cap, định nghĩa trực tiếp trong file metadata YAML của bài viết:
       - `meta.dropcap: true` (Bắt buộc bật drop-cap cho bài viết này).
       - `meta.dropcap: false` (Bắt buộc tắt drop-cap cho bài viết này, hiển thị văn bản bình thường).
  4. **Tránh drop-cap trên đoạn chú thích trong dấu ngoặc đơn `(...)`**:
     - Các đoạn chỉ dẫn nghi thức, chú thích hành trì mở đầu bằng dấu ngoặc đơn `(...)` hoặc `*(...)*` (ví dụ: `*(Đứng thẳng hoặc quỳ trang nghiêm...)*`) tuyệt đối **KHÔNG ĐƯỢC** phóng to chữ hoa đầu dòng.
     - Drop-cap phải được tự động bỏ qua đoạn chú thích và chuyển sang đoạn văn bản chính (kệ tụng, bài kinh) kế tiếp.
  5. **Triển khai CSS & JavaScript**:
     - Toàn bộ CSS drop-cap phải được scope dưới class `article.td-dropcap-enabled`.
     - Phải luôn có luật reset (`float: none !important; font-size: inherit !important;`) đối với các khối trích dẫn (`blockquote`), thẻ thông tin (`sutra-meta`, `notice`, `tm-collapsible-guide`), và các đoạn chú thích ngoặc đơn (`p.no-dropcap`, `p.tm-sutra-note`, `p:has(> em:only-child)`), để phần thông tin dịch giả/mục lục đầu bài và chú thích không bao giờ bị dính drop-cap ngoài ý muốn.

### 3.5. Quy tắc Phân Cấp Hiển Thị & Ưu Tiên Đi Thẳng Vào Nội Dung Chính (Hierarchy-Aware Content Focus Rule)
* **Triết lý UX cốt lõi**: Giao diện phải hiểu chủ đích của người đọc theo từng cấp trang, đưa người đọc chạm ngay vào nội dung cần xem mà không bị cản trở bởi các phần đầu trang trùng lặp hoặc hướng dẫn dài dòng:
  1. **Không lặp lại Tiêu đề Site / Bảng phương châm ở trang con**:
     - Bảng phương châm `.tinhdo-plaque-strip` ("Tâm Hạnh / Công Phu") **chỉ hiển thị ở Trang chủ (`home`)**.
     - Tuyệt đối không render lại tên website cỡ lớn (`.grid-header .logo`) ở các trang con (`page.twig`, `blog.twig`, `landingpage.twig`), vì thanh `.tinhdo-top-bar` đã hiển thị thương hiệu cố định.
     - Breadcrumb (`partials/breadcrumb.twig`) giữ gọn 1 dòng (`🏠 Trang chủ › ...`).
  2. **Mặc định thu gọn phần Hướng dẫn / Thông tin phụ / Lời nói đầu dài**:
     - Các khối `blockquote` thông tin & hướng dẫn ở ngay đầu bài viết, hướng dẫn tải ảnh ở trang Gallery, và các khối Lời nói đầu / Lời giới thiệu dài trong trình đọc (`details.tm-knnp-preface-box`) mặc định **thu gọn thành 1 dòng nhỏ** (`details.tm-collapsible-guide` / không gắn thuộc tính `open`), khi cần người đọc mới bấm mở rộng.
     - Ở các trang trình đọc đơn bài (`[:knnpreader:]`, `[:kpcreader:]`), ẩn tiêu đề vỏ bọc `<h1>` trùng lặp để đi thẳng vào thẻ bài đọc/nghe chính thức.
  3. **Tự động định vị thông minh (Smart Content Focus)**:
     - Trang danh mục / mục lục (`tm-item-folder`, `tm-is-toc-page`) giữ ở đầu danh sách.
     - Trang bài chi tiết cấp lá (`tm-item-file`) và các liên kết chọn bài cụ thể (`?thu=`, `?verse=`, `?story=`, `#truyen-...`) tự động định vị ngay vào khung đọc/nghe chính (có bù trừ chiều cao thanh sticky top bar).

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

### 4.6. Phòng chống lỗi mạng chập chờn & DNS (Git Network Retry)
* Khi thực hiện các lệnh Git kết nối ra ngoài internet (`fetch`, `pull`, `clone`), môi trường server hoặc mạng gia đình có thể gặp hiện tượng DNS timeout tạm thời (`Could not resolve host: github.com` mã thoát 128) hoặc connection reset.
* Các script triển khai (`deploy_server.sh`, `rebuild_server.sh`, `remote_one_click_deploy.sh`) **bắt buộc bọc các lệnh Git mạng qua hàm retry `git_network_retry`** (tối thiểu 4 lần thử với độ trễ tăng dần exponential backoff 2s, 4s, 8s).
* Không để một lỗi mạng chập chờn nhất thời kích hoạt rollback toàn bộ hệ thống ngay lập tức.

### 4.7. Bảo toàn quyền thực thi của kịch bản (`100755` & Tự phục hồi `chmod +x`)
* Toàn bộ các script thực thi trong `scripts/*.sh` phải được lưu trữ trong Git index với quyền `100755` (`git update-index --chmod=+x scripts/*.sh`). Điều này đảm bảo khi `git clone`, `git pull` hoặc `git reset --hard` diễn ra trên bất kỳ môi trường nào, Git sẽ trực tiếp tạo file với quyền thực thi.
* Mọi script triển khai và bảo trì (`deploy_server.sh`, `rebuild_server.sh`, `remote_one_click_deploy.sh`) **bắt buộc chạy lệnh tự phục hồi quyền `chmod +x "$BASE_DIR/scripts/"*.sh`** ngay tại đầu script và trong hàm `rollback_deployment()`. Không để xảy ra tình trạng sau khi rollback hệ thống bị mất cờ `+x` khiến người dùng phải chạy `chmod +x` thủ công.

### 4.8. Quy tắc bảo vệ & cô lập các thư mục backup (`*_old`, `*_backup`, `*_bak`)
* Trên server hoặc môi trường phát triển thường tồn tại các thư mục backup do người dùng hoặc quản trị viên tạo ra (ví dụ: `phatphap_old`, `content_old`, `media_old`...).
* Toàn bộ hệ thống phải áp dụng các biện pháp bảo vệ:
  1. Thêm `*_old/`, `*_old`, `*_backup/`, `*_bak/` vào `.gitignore` ở cả Web root (`v2.x`) và Content (`content`).
  2. Các công cụ tìm kiếm và đánh chỉ mục (như `build_search_index.php`) **bắt buộc loại trừ** các đường dẫn chứa `_old`, `_backup`, `_bak` để không làm ô nhiễm kết quả tìm kiếm của độc giả.
  3. Các công cụ đóng gói và đồng bộ (`pack_middle_sync.sh`, `rsync`) **bắt buộc dùng `--exclude="*_old*"`** để không đóng gói nhầm dữ liệu backup cũ vào bản phân phối.
  4. Script phát hiện và cảnh báo nếu người dùng đang vô tình thực thi trong một thư mục backup (kiểm tra trong `config.sh`).

