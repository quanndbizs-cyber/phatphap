#Chạy:
```
sudo visudo -f /etc/sudoers.d/deploy-web
```
#Thêm (thay quannd bằng user SSH thực tế nếu khác):
```
quannd ALL=(root) NOPASSWD: /usr/sbin/nginx -t
quannd ALL=(root) NOPASSWD: /usr/bin/systemctl reload php8.4-fpm
quannd ALL=(root) NOPASSWD: /usr/bin/systemctl reload nginx
```
#Kiểm tra:
```
sudo chmod 440 /etc/sudoers.d/deploy-web
sudo visudo -c
```
#Chạy thực tế
```
quannd@qts-home:/var/www/html/phatphap/content$ sudo ../scripts/deploy_server.sh
```
#Khi lỗi git repo, chạy tiếp
```
sudo git config --global --add safe.directory /var/www/html/phatphap/content
```
