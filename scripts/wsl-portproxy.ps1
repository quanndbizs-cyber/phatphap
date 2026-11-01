# Yêu cầu chạy PowerShell với quyền Administrator (Run as Administrator)
# Script tự động:
# 1. Lấy IP chuẩn của WSL
# 2. Cập nhật alias 'wsl_localhost' vào C:\Windows\System32\drivers\etc\hosts
# 3. Giải phóng cổng 80 nếu dịch vụ IIS (W3SVC) của Windows đang chiếm giữ gây lỗi [Not Found]
# 4. Forward cả IPv4 (0.0.0.0:80) và IPv6 ([::]:80 / localhost) sang Nginx trên WSL

$ErrorActionPreference = "Continue"

# 1. Lấy IP đầu tiên của WSL (tránh trường hợp hostname -I trả về nhiều IP của Docker/bridge)
$rawIP = (wsl hostname -I)
if (-not $rawIP) {
    Write-Error "Không lấy được IP từ WSL. Hãy đảm bảo WSL đang chạy."
    exit 1
}
$wslIP = $rawIP.Trim().Split(" ")[0]
$port = 80
$hostAlias = "wsl_localhost"

Write-Host "=== Cấu hình kết nối Web WSL ===" -ForegroundColor Cyan
Write-Host "WSL IP hiện tại: $wslIP" -ForegroundColor Green

# 2. Tự động cập nhật file hosts của Windows cho alias wsl_localhost
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
if (Test-Path $hostsPath) {
    try {
        $hostsContent = Get-Content $hostsPath -ErrorAction Stop
        $filteredContent = $hostsContent | Where-Object { $_ -notmatch "\s+$hostAlias(\s|$)" }
        $newEntry = "$wslIP`t$hostAlias"
        $filteredContent += $newEntry
        Set-Content -Path $hostsPath -Value $filteredContent -Force -Encoding Ascii
        Write-Host "[OK] Đã cập nhật file hosts: $wslIP -> $hostAlias" -ForegroundColor Green
    } catch {
        Write-Warning "Không thể ghi file hosts (Hãy chạy PowerShell bằng quyền Run as Administrator)."
    }
}

# 3. Kiểm tra dịch vụ IIS (W3SVC) trên Windows có đang chiếm port 80 gây lỗi 404 Not Found không
$iisService = Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue
if ($iisService -and $iisService.Status -eq 'Running') {
    Write-Warning "Phát hiện dịch vụ Windows IIS (W3SVC) đang chạy và chiếm cổng 80 (gây lỗi Not Found trên localhost / IP LAN)."
    try {
        Stop-Service -Name "W3SVC" -Force -ErrorAction Stop
        Write-Host "[OK] Đã tạm dừng dịch vụ IIS (W3SVC) để nhường cổng 80 cho WSL Nginx." -ForegroundColor Green
    } catch {
        Write-Warning "Không thể dừng W3SVC tự động. Bạn có thể chạy: Stop-Service W3SVC -Force"
    }
}

# 4. Xóa rule portproxy cũ và tạo rule mới cho cả IPv4 (0.0.0.0) và IPv6 (:: / ::1 cho localhost)
netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null | Out-Null
netsh interface portproxy delete v6tov4 listenport=$port listenaddress=:: 2>$null | Out-Null
netsh interface portproxy delete v6tov4 listenport=$port listenaddress=::1 2>$null | Out-Null

netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIP
netsh interface portproxy add v6tov4 listenport=$port listenaddress=:: connectport=$port connectaddress=$wslIP
netsh interface portproxy add v6tov4 listenport=$port listenaddress=::1 connectport=$port connectaddress=$wslIP

# 5. Mở Firewall Windows cho Port 80
if (-not (Get-NetFirewallRule -DisplayName "WSL Port $port" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName "WSL Port $port" `
        -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
}

Write-Host ""
Write-Host "=== Hoàn tất! Bạn có thể truy cập web qua các địa chỉ: ===" -ForegroundColor Cyan
Write-Host "1. Trực tiếp qua alias (Ổn định nhất): http://$hostAlias/phatphap/" -ForegroundColor Yellow
Write-Host "2. Trang tĩnh cũ:                      http://$hostAlias/phatphap_html/" -ForegroundColor Yellow
Write-Host "3. Qua localhost / IP LAN:             http://localhost/phatphap/" -ForegroundColor Yellow
