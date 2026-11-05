# 📖 HƯỚNG DẪN TỰ TẠO TRANG MEDIA PLAYLIST (AUDIO & SÁCH ĐỌC)

> **Tài liệu hướng dẫn quản trị viên:** Cách tạo và quản lý trang Media Playlist (Pháp Âm, Kinh Sách, Audiobookshelf, Tóm tắt truyện) tương tự hệ thống **Báo Ứng Hiện Đời (BUHD)** — có thể thiết lập **trực quan ngay trên giao diện Backend Typemill** hoặc sử dụng các **Shortcode linh hoạt**.

---

## 📑 MỤC LỤC
1. [Tổng Quan Kiến Trúc Media Player](#1-tổng-quan-kiến-trúc-media-player)
2. [Cách 1: Thiết Lập Trực Quan Ngay Trên Backend (Khuyến Nghị)](#2-cách-1-thiết-lập-trực-quan-ngay-trên-backend-khuyến-nghị)
3. [Cách 2: Sử Dụng Shortcode Trong Nội Dung Bài Viết](#3-cách-2-sử-dụng-shortcode-trong-nội-dung-bài-viết)
4. [Cấu Trúc Dữ Liệu Tóm Tắt & Danh Sách Truyện (Stories Data)](#4-cấu-trúc-dữ-liệu-tóm-tắt--danh-sách-truyện-stories-data)
5. [Khai Báo Album Mới Vào Thư Viện Audiobookshelf (`abs_catalog.json`)](#5-khai-báo-album-mới-vào-thư-viện-audiobookshelf-abs_catalogjson)
6. [Ví Dụ Thực Tế: Tạo Trang Album Pháp Âm Mới Từ A Đến Z](#6-ví-dụ-thực-tế-tạo-trang-album-pháp-âm-mới-từ-a-đến-z)

---

## 1. Tổng Quan Kiến Trúc Media Player

Hệ thống Media Player (`plugins/mediaplayer`) cung cấp trải nghiệm đa phương tiện hiện đại cho website Phật Pháp:

| Thành phần | Đặc điểm & Tính năng |
| :--- | :--- |
| **Trình phát Audiobookshelf (ABS)** | Phát trực tiếp từng bài MP3, hỗ trợ thanh tua (seek), tự động nhảy bài tiếp theo (auto-next), điều chỉnh tốc độ đọc (0.75x — 2.0x), tải file trực tiếp. |
| **Giao diện Tab Kép (`buhdview`)** | **Tab 1: Nghe Audio MP3** (danh sách bài có kèm badge số lượng bài)<br>**Tab 2: Tóm Tắt & Đọc Sách / Video** (thanh tìm kiếm trực tiếp, nút đọc sách, video YouTube tích hợp). |
| **Trung tâm MediaHub (`mediahub`)** | Bộ khung đa tập (cột trái chọn tập 1-7, cột phải phát audio tương ứng). |
| **Tra cứu danh sách bài (`storylist` / `tracklist`)** | Bộ lọc tìm kiếm nhanh không tải lại trang, gắn sẵn nút đọc sách, tải MP3, xem video. |

---

## 2. Cách 1: Thiết Lập Trực Quan Ngay Trên Backend (Khuyến Nghị)

Từ phiên bản `1.1.0`, bạn **không cần gõ shortcode hay can thiệp code**. Có thể cấu hình trực quan 100% trong trang quản trị:

### Các bước thực hiện:
1. Đăng nhập trang Admin Typemill: `https://<ten-mien>/tm/content/visual`.
2. Mở bài viết muốn gắn Media Player (ví dụ: một tập kinh, tuyển tập pháp âm mới).
3. Nhìn sang cột bên phải (khu vực Metadata), chọn Tab **`Media Player`** (nằm cạnh tab *Content* và *Meta*).
4. Điền các trường thông tin:

![Giao diện Backend Media Player](https://raw.githubusercontent.com/quanndbizs-cyber/phatphap/v2.x/plugins/mediaplayer/preview-admin.png) *(minh họa)*

#### Các trường thiết lập trong Tab `Media Player`:

* **Chế độ hiển thị Media trên trang (`player_mode`):**
  * `Chỉ hiển thị khi chèn Shortcode trong bài viết`: Mặc định, bạn tự đặt shortcode ở vị trí mong muốn trong bài.
  * `Tự động hiển thị Tab Kép (Audio MP3 + Tóm tắt) ở ĐẦU bài viết`: Tự động chèn giao diện Tab kép lên trên cùng bài viết.
  * `Tự động hiển thị Tab Kép (Audio MP3 + Tóm tắt) ở CUỐI bài viết`: Tự động chèn giao diện Tab kép xuống cuối bài viết.
  * `Tự động hiển thị Trình phát Audio MP3 ở ĐẦU bài viết`: Chỉ hiện trình phát Audio MP3 đơn giản ở đầu trang.
  * `Tự động hiển thị Trình phát Audio MP3 ở CUỐI bài viết`: Chỉ hiện trình phát Audio MP3 ở cuối trang.
* **Tiêu đề Player / Album Playlist (`title`):**
  * Nhập tiêu đề phát, ví dụ: `Kinh Địa Tạng Bồ Tát Bổn Nguyện — Trọn bộ 3 Quyển`.
* **Audiobookshelf Key (`abs_key`):**
  * Mã album trong hệ thống `abs_catalog.json` (ví dụ: `buhd1`, `buhd2`, `buhd3`, `buhd5_1,buhd5_2`, `dia_tang`...).
  * Có thể nhập nhiều key cách nhau bằng dấu phẩy nếu muốn gộp nhiều album thành 1 danh sách.
* **Link bộ sưu tập Audio ngoài (`exturl`):**
  * Link mở trên Audio.com, Google Drive hoặc YouTube (ví dụ: `https://audio.com/quan-nguyen-duc-1/collections/...`).
* **Đường dẫn đọc sách trực tuyến (`read_url`):**
  * Link mở bản chữ đọc sách (ví dụ: `/nhan-qua/doc-sach/bao-ung-hien-doi-tap-3`).
* **Đường dẫn file PDF tải về (`pdf_url`):**
  * Link file PDF đính kèm (ví dụ: `/media/files/bao-ung-hien-doi-tap-3.pdf`).
* **Dữ liệu Bài / Truyện Tùy Chỉnh (`stories_yaml`):**
  * Nhập danh sách bài (nếu muốn quản lý trực tiếp nội dung bài trên trang này mà không cần sửa file code).

5. Nhấp nút **`Save`** màu xanh ở dưới cùng tab.
6. Mở trang ngoài frontend để thưởng thức kết quả!

---

## 3. Cách 2: Sử Dụng Shortcode Trong Nội Dung Bài Viết

Nếu bạn muốn đặt player vào một vị trí cụ thể giữa các đoạn văn bản trong bài viết Markdown, hãy sử dụng hệ thống Shortcode:

### 3.1. Shortcode Tab Kép BUHD (`[:buhdview:]`)
Tạo giao diện Tab kép hoàn chỉnh (Tab Nghe Audio + Tab Danh Sách Truyện):

```markdown
[:buhdview key="buhd3" stories="stories" title="Báo Ứng Hiện Đời — Tập 3 (Trọn bộ 46 bài MP3)" exturl="https://audio.com/quan-nguyen-duc-1/collections/bao-ung-hien-djoi-tap-3" :]
```

> 💡 **Mẹo viết ngắn:** Nếu bạn đã điền các thông tin trong Tab **Media Player** ở Backend, trong bài viết Markdown bạn chỉ cần gõ ngắn gọn:
> ```markdown
> [:buhdview:]
> ```
> Hệ thống sẽ tự động lấy `key`, `title`, `exturl` từ thiết lập Backend!

### 3.2. Shortcode Trình Phát Audio MP3 (`[:absplayer:]`)
Chỉ hiển thị Trình phát Audio MP3 (kèm danh sách bài và tìm kiếm):

```markdown
[:absplayer key="buhd3" title="Nghe Trọn Bộ Tập 3" exturl="https://audio.com/..." :]
```
*(Cũng hỗ trợ gõ ngắn gọn `[:absplayer:]` khi đã lưu thông tin trong Backend).*

### 3.3. Shortcode Danh Sách Tóm Tắt & Đọc Sách (`[:storylist:]`)
Hiển thị danh sách từng bài, tóm tắt nhân quả, thanh tìm kiếm từ khóa, kèm nút nghe MP3, đọc sách và xem video:

```markdown
[:storylist id="stories" :]
```

### 3.4. Shortcode Trung Tâm MediaHub Đa Tập (`[:mediahub:]`)
Hiển thị giao diện bộ sưu tập nhiều tập (cột trái chọn tập, cột phải phát audio):

```markdown
[:mediahub id="main" height="680px" :]
```

### 3.5. Shortcode Thu Gọn / Mở Rộng (`[:accordion:]`)
Dùng để nhóm nội dung dài hoặc ghi chú mục lục:

```markdown
[:accordion title="Bấm vào đây để xem Lời Nói Đầu" open="false" :]
Nội dung chi tiết của lời nói đầu nằm ở đây...
[:/accordion:]
```

---

## 4. Cấu Trúc Dữ Liệu Tóm Tắt & Danh Sách Truyện (Stories Data)

Để Tab **Tóm Tắt & Đọc Sách** hiển thị đầy đủ thông tin từng bài, dữ liệu danh sách bài được định dạng theo cấu trúc YAML dưới đây.

Bạn có thể đặt dữ liệu này vào:
- **Lựa chọn A:** Ô **`stories_yaml`** ngay trong Tab *Media Player* ở Backend Admin.
- **Lựa chọn B:** File YAML đi kèm bài viết (ví dụ: `content/02-nhan-qua/03-tap-3.yaml`).

### Mẫu định dạng YAML chuẩn:

```yaml
mediaplayer:
  stories:
    items:
      - id: 1
        title: "Lời Nói Đầu & Giới Thiệu"
        summary: "Giải thích duyên khởi xuất bản sách và ý nghĩa của việc thấu suốt nhân quả hiện đời."
        audio_src: "https://qts-home.duckdns.org/audiobookshelf/api/items/buhd3/file/1"
        read_url: "/nhan-qua/doc-sach/bao-ung-hien-doi-tap-3#loi-noi-dau"
        read_label: "📖 Đọc Lời Nói Đầu"
        pdf_url: "/media/files/bao-ung-hien-doi-tap-3.pdf"
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

      - id: 2
        title: "Tội Lỗi Đồ Tể & Quả Báo Tức Thì"
        summary: "Kể về một người làm nghề mổ heo phải chịu quả báo đau đớn, qua đó cảnh tỉnh nghiệp sát sinh hại vật."
        audio_src: "https://qts-home.duckdns.org/audiobookshelf/api/items/buhd3/file/2"
        read_url: "/nhan-qua/doc-sach/bao-ung-hien-doi-tap-3#truyen-2"
        read_label: "📖 Đọc Sách"
```

### Ý nghĩa từng trường dữ liệu:
| Trường | Kiểu dữ liệu | Ý nghĩa & Tính năng |
| :--- | :--- | :--- |
| `id` | Số (int) | Số thứ tự bài (hiển thị `#1`, `#2`...). |
| `title` | Chuỗi (string) | Tên bài / tên truyện. |
| `summary` | Chuỗi (string) | Tóm tắt cốt truyện & bài học nhân quả (bộ lọc tìm kiếm sẽ tìm cả trong trường này). |
| `audio_src` | URL | Link file âm thanh MP3 trực tiếp. Tự động sinh nút `🎧 Nghe Audio` và nút `💾 Tải MP3`. |
| `read_url` | URL tương đối/tuyệt đối | Đường dẫn mở trang đọc sách. Hệ thống sẽ **tự động thêm base_url** nếu là đường dẫn nội bộ (ví dụ `/nhan-qua/...`). |
| `read_label` | Chuỗi | Nhãn nút đọc sách (mặc định là `📖 Sách đọc`). |
| `pdf_url` | URL | Đường dẫn tải file PDF sách. Sinh nút `📄 Bản PDF`. |
| `video_url` | URL YouTube | Link video YouTube. Hệ thống sẽ sinh nút `🎬 Xem Video` (bấm vào sẽ bung mở khung xem video trực tiếp mà không cần rời trang) và link `↗ YouTube`. |

---

## 5. Khai Báo Album Mới Vào Thư Viện Audiobookshelf (`abs_catalog.json`)

Toàn bộ danh mục phát MP3 chất lượng cao được lưu trong file cấu hình:
📁 `plugins/mediaplayer/data/abs_catalog.json`

Mỗi album tương ứng với một `key` (ví dụ `buhd1`, `buhd2`, `kt_1`...):

```json
{
  "host": "https://qts-home.duckdns.org/audiobookshelf",
  "token": "...",
  "by_key": {
    "dia_tang": {
      "id": "item-uuid-cua-album-tren-abs",
      "name": "Kinh Địa Tạng Bồ Tát Bổn Nguyện",
      "key": "dia_tang",
      "tracks": [
        {
          "index": 1,
          "filename": "Quyển Thượng — Phẩm 1 Đến 4.mp3",
          "ino": "file-id-1"
        },
        {
          "index": 2,
          "filename": "Quyển Trung — Phẩm 5 Đến 8.mp3",
          "ino": "file-id-2"
        },
        {
          "index": 3,
          "filename": "Quyển Hạ — Phẩm 9 Đến 13.mp3",
          "ino": "file-id-3"
        }
      ]
    }
  }
}
```

Sau khi khai báo vào `abs_catalog.json`, bạn có thể dùng `dia_tang` ở bất cứ đâu trong backend hoặc shortcode:
`[:absplayer key="dia_tang" title="Kinh Địa Tạng" :]` hoặc `[:buhdview key="dia_tang" :]`.

---

## 6. Ví Dụ Thực Tế: Tạo Trang Album Pháp Âm Mới Từ A Đến Z

Giả sử bạn muốn tạo trang mới: **"Tuyển Tập Truyện Cổ Phật Giáo"** nằm tại địa chỉ `/truyen-co-phat-giao`.

### Bước 1: Tạo trang trong Typemill
- Vào Admin -> Bấm `Add Item` -> Đặt tên: `Truyện Cổ Phật Giáo` -> Slug: `truyen-co-phat-giao`.

### Bước 2: Thiết lập Tab Media Player (Không cần code)
- Chuyển sang tab **Media Player** bên phải.
- Chọn `Chế độ hiển thị Media`: **`Tự động hiển thị Tab Kép (Audio MP3 + Tóm tắt) ở ĐẦU bài viết`**.
- Nhập `Tiêu đề Player`: **`Tuyển Tập Truyện Cổ Phật Giáo — Giọng Đọc Truyền Cảm`**.
- Nhập `Audiobookshelf Key`: **`tcpg`** *(đã khai báo trong catalog)*.
- Nhập `Link bộ sưu tập Audio ngoài`: `https://audio.com/...`.
- Nhập `Đường dẫn đọc sách trực tuyến`: `/doc-sach/truyen-co-phat-giao`.
- Bấm **Save**.

### Bước 3: Soạn nội dung giới thiệu bài viết
Trong ô soạn thảo Markdown chính, chỉ cần viết lời tựa:

```markdown
# Tuyển Tập Truyện Cổ Phật Giáo

Chào mừng quý Phật tử và bạn đọc đến với tuyển tập những câu chuyện cổ Phật giáo ý nghĩa, giúp nuôi dưỡng tâm từ bi, trí tuệ và hiểu sâu sắc lý nhân quả duyên sinh...
```

👉 **Xong!** Khi mở xem trang web, ngay phía trên bài viết sẽ xuất hiện trình phát Audio Tab Kép hiện đại, đầy đủ chức năng tìm kiếm, nghe nhạc và liên kết đọc sách mà bạn không cần phải viết một dòng shortcode nào!
