Script tự động cập nhật source code từ Typemill upstream (`tp`) mà **không đụng chạm hay gây conflict thư mục `content`**.

---

### 1. Nguyên nhân gây conflict khi pull/merge từ `tp`
* Trong repo gốc Typemill (`tp/v2.x`), `content` là **thư mục thông thường** (chứa `content/index.yaml`, `_de/...`). Trong các bản cập nhật gần đây (như `v2.28.1`), Typemill có chỉnh sửa các file bên trong `content/`.
* Trong dự án của bạn, `content` đã được tách thành **Git submodule độc lập**.
* Khi chạy `git merge` hoặc `git pull` thông thường, Git sẽ phát hiện va chạm kiểu dữ liệu `directory vs submodule` và báo lỗi:
  ```text
  CONFLICT (modify/delete): content/index.yaml deleted in HEAD and modified in tp/v2.x.
  CONFLICT (file/directory): directory in the way of content from HEAD; moving it to content~HEAD instead.
  ```

---

### 2. Các script đã được tạo

1. **Bash Script (Linux / WSL):** [`scripts/pull_tp_update.sh`](file:///var/www/html/phatphap/scripts/pull_tp_update.sh) (đã cấp quyền thực thi `chmod +x`).
2. **PowerShell Script (Windows):** [`scripts/pull_tp_update.ps1`](file:///var/www/html/phatphap/scripts/pull_tp_update.ps1).

#### Cơ chế hoạt động của script:
1. **Fetch & kiểm tra remote `tp`:** Tự động fetch tag & nhánh mới nhất (`tp/v2.x`, `v2.28.1`...). Tự động nhận diện khi bạn truyền `2.8.1` thành tag `v2.28.1` của Typemill.
2. **Bảo vệ submodule `content`:** Lưu lại commit SHA hiện tại của `content`, đặt cờ tạm thời `submodule.content.ignore all` để tránh lỗi autostash dirty working tree.
3. **Merge source:** Chạy `git merge --no-commit --no-ff <target>`.
4. **Tự động giải quyết conflict `content`:**
   * Dọn sạch toàn bộ file `content/*` và thư mục tạm `content~HEAD*` do upstream đưa vào index.
   * Khôi phục chính xác submodule `content` và file `.gitmodules` về trạng thái `HEAD` ban đầu.
5. **Kiểm tra an toàn & tạo merge commit:**
   * Nếu có conflict ở các file core do bạn tùy biến (ngoài `content`), script sẽ liệt kê rõ để bạn kiểm tra.
   * Nếu chỉ có conflict ở `content`, script tự xử lý xong và tạo commit merge: `chore: update Typemill source from <version> (preserve content submodule)`.
   * Ghi nhận merge commit vào Git history giúp các lần update sau này không bị lặp lại conflict.

---

### 3. Hướng dẫn sử dụng

#### Cách 1: Cập nhật bản 2.8.1 (tag `v2.28.1`):
```bash
./scripts/pull_tp_update.sh 2.8.1
```
*(Hoặc trên Windows PowerShell: `.\scripts\pull_tp_update.ps1 2.8.1`)*

#### Cách 2: Cập nhật bản mới nhất trên nhánh `tp/v2.x`:
```bash
./scripts/pull_tp_update.sh
```

#### Cách 3: Muốn merge và xem thử trước (chưa commit):
```bash
./scripts/pull_tp_update.sh 2.8.1 --no-commit
```
*(Sau khi kiểm tra `git status` / `git diff --cached`, bạn chỉ cần gõ `git commit` để hoàn tất).*

---

### 4. Sau khi chạy script thành công
* Đẩy mã nguồn đã update lên repo của bạn:
  ```bash
  git push origin v2.x
  ```
* Nếu có cập nhật thư viện PHP/JS (script sẽ tự động nhắc nhở nếu `composer.lock` hoặc `package.json` thay đổi):
  ```bash
  composer install --no-dev --optimize-autoloader
  ```