# ==============================================================================
# Script: one_click_deploy.ps1
# Mục đích: PowerShell script 1-Click Deploy cho môi trường Windows / WSL
# Sử dụng:
#   .\scripts\one_click_deploy.ps1
#   .\scripts\one_click_deploy.ps1 -Prod
# ==============================================================================

param(
    [switch]$Prod,
    [string]$SshTarget = ""
)

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "🚀 [1-CLICK DEPLOY POWERSHELL] BẮT ĐẦU QUY TRÌNH DEPLOY..." -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $PSScriptRoot
Set-Location $baseDir

# 1. Gọi script đóng gói trong bash WSL
$prodArg = if ($Prod) { "--prod" } else { "" }
wsl bash -c "$baseDir/scripts/pack_middle_sync.sh $prodArg"

# 2. Commit & Push nhánh content
Set-Location "$baseDir/content"
wsl git add -A
$statusContent = wsl git status --porcelain
if ($statusContent) {
    $commitMsg = "Sync middle_sync & content: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    wsl git commit -m "$commitMsg"
    Write-Host "-> Đang đẩy dữ liệu content lên GitHub (origin content)..." -ForegroundColor Yellow
    wsl git push origin content
    Write-Host "✅ Đã push nhánh content thành công!" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Không có thay đổi mới trong content/." -ForegroundColor Gray
}

# 2b. Commit & Push nhánh main (v2.x)
Set-Location $baseDir
wsl git add -A
$statusMain = wsl git status --porcelain
if ($statusMain) {
    $mainCommitMsg = "feat(deploy): update codebase ($(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))"
    wsl git commit -m "$mainCommitMsg"
    Write-Host "-> Đang đẩy mã nguồn main lên GitHub..." -ForegroundColor Yellow
    wsl git push origin v2.x
    Write-Host "✅ Đã push nhánh main (v2.x) thành công!" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Không có thay đổi mới trong mã nguồn main." -ForegroundColor Gray
}

# 3. Kích hoạt server nếu có SSH
if ($SshTarget -ne "") {
    Write-Host "-> Đang chạy deploy trên remote server qua SSH..." -ForegroundColor Yellow
    ssh $SshTarget "cd /var/www/html/phatphap && ./scripts/deploy_server.sh"
} else {
    Write-Host "`n👉 Để triển khai trên Deploy Server, chỉ cần chạy 1 lệnh:" -ForegroundColor Yellow
    Write-Host "   cd /var/www/html/phatphap && ./scripts/deploy_server.sh" -ForegroundColor White
}

Write-Host "`n🎉 QUY TRÌNH DEPLOY HOÀN TẤT!" -ForegroundColor Cyan
