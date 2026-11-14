# Hướng Dẫn & Quy Tắc Dành Cho AI Agent (Branch `content`)

Chào mừng AI Agent! File này quy định các nguyên tắc **bắt buộc (Non-Negotiable)** khi thao tác, biên tập và xuất bản nội dung trên nhánh **`content`** của kho mã nguồn Phật Pháp (Typemill Platform).

Tài liệu quản trị chi tiết đầy đủ xem tại: [`.agent/rules/project-governance.md`](.agent/rules/project-governance.md).

---

## ⚠️ QUY TẮC SỐ 1: MARKDOWN THUẦN & TUYỆT ĐỐI CẤM THẺ HTML THÔ (MARKDOWN PURITY RULE)

### 1. Bối Cảnh Kỹ Thuật
- Bộ chuyển đổi Markdown của hệ thống Typemill (`Parsedown`) chạy ở chế độ bảo mật nghiêm ngặt (**`SafeMode = true`**).
- Khi gặp **bất kỳ thẻ HTML thô nào** (`<div>`, `<span>`, `<audio>`, `<input>`, `<script>`, `<p>`, `<a>`, `<br>`, `<style>`), parser sẽ tự động escape toàn bộ thành ký tự thực thể HTML (`&lt;div...&gt;`, `&lt;audio...&gt;`), khiến **toàn bộ mã nguồn HTML bị phơi bày dạng chữ thô xấu xí trên giao diện người dùng**.

### 2. Các Điều Cấm Tuyệt Đối Trong File `.md`
1. ❌ **CẤM chèn bất kỳ thẻ HTML thô nào**:
   - Không dùng `<div>`, `<span>`, `<p>`, `<section>`.
   - Không dùng `<audio>`, `<video>`, `<iframe>`.
   - Không dùng `<input>`, `<button>`, `<script>`.
   - Không dùng `<br>` hoặc `<hr>` bằng thẻ HTML (dùng dòng trống hoặc cú pháp `---` chuẩn Markdown).
   - Không dùng `<a href="...">` (dùng cú pháp Markdown chuẩn `[Tên](URL)`).
2. ❌ **CẤM chèn thẻ neo anchor giả**:
   - Không chèn `<div id="slug"></div>` hoặc `<a name="slug"></a>`.
   - Không chèn mã `{ #anchor-name }` vào tiêu đề Markdown (`## Tiêu đề { #anchor }`) hoặc YAML (`title: '... { #anchor }'`). Typemill tự động sinh slug anchor chuẩn theo tiêu đề (`[#](#slug)`).

### 3. Giải Pháp Định Dạng Bằng Markdown Thuần (Pure Markdown Alternatives)
- **Bảng dữ liệu & Tra cứu**: Sử dụng bảng Markdown chuẩn (`| Tiêu đề 1 | Tiêu đề 2 |` kết hợp `| :---: | :--- |`). Người dùng và trình duyệt tra cứu nhanh bằng `Ctrl+F` hoặc tìm kiếm của trình duyệt rất nhanh và thân thiện trên cả điện thoại và máy tính.
- **Khối thông tin / Audio Callout**: Sử dụng Markdown Blockquote (`> ...`) kết hợp liên kết Markdown:
  ```markdown
  > 🎧 **Audio Bài Đọc:** [▶ Bấm để nghe trực tiếp file MP3](https://...) • ⏱ **Thời lượng:** 12:21  
  > 📻 **Kho Audiobookshelf:** [Mở Album 20 bài khai thị (ly_YSmkgPO)](https://...) • [💾 Tải file MP3](https://...)
  ```
- **Phân đoạn nội dung**: Dùng tiêu đề chuẩn Markdown (`#`, `##`, `###`, `####`).
- **Trình phát Media đa tập**: Sử dụng cú pháp Shortcode đã được hỗ trợ bởi plugin Typemill:
  ```markdown
  [:mediahub id="khaithi" height="680px" :]
  ```

---

## 📦 QUY TẮC GIT & COMMIT

1. **Cam kết chọn lọc**: CẤM dùng `git add .` hoặc `git add -A`. Chỉ stage đích danh từng file thuộc phạm vi task (`git add <file>`).
2. **Quy chuẩn thông điệp commit trên nhánh `content`**:
   - `content(<chuyên-mục>): <nội dung tóm tắt tiếng Việt không dấu hoặc có dấu>`
   - Ví dụ: `content(phat-giao): loai bo toan bo the html tho trong bai khai thi`
   - `content(nhan-qua): cap nhat tom tat 7 tap BUHD`
3. **Commit sau mỗi lần sửa xong một hạng mục**.
