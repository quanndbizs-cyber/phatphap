<#
.SYNOPSIS
    Pull / Merge bản cập nhật mới nhất từ remote `tp` (Typemill upstream) vào source hiện tại,
    bỏ qua và bảo vệ nguyên vẹn thư mục / submodule `content`.

.DESCRIPTION
    Cách sử dụng:
      .\scripts\pull_tp_update.ps1                  # Mặc định lấy từ tp/v2.x
      .\scripts\pull_tp_update.ps1 2.8.1            # Lấy bản tag v2.28.1 (Typemill 2.8.1)
      .\scripts\pull_tp_update.ps1 v2.28.1          # Chỉ định tag v2.28.1
      .\scripts\pull_tp_update.ps1 -NoCommit        # Merge nhưng chưa commit để review
#>

[CmdletBinding()]
param (
    [Parameter(Position = 0)]
    [string]$TargetRef = "",

    [Parameter()]
    [switch]$NoCommit
)

$ErrorActionPreference = "Stop"

$BaseDir = Split-Path -Parent $PSScriptRoot
Set-Location $BaseDir

$RemoteName = "tp"
$UpstreamUrl = "https://github.com/typemill/typemill.git"
$DefaultTarget = "tp/v2.x"

Write-Host "=== TYPEMILL SOURCE UPDATER (EXCLUDE CONTENT) ===" -ForegroundColor Cyan

# 1. Kiểm tra Git
$currentBranch = (git rev-parse --abbrev-ref HEAD 2>$null)
if (-not $currentBranch) {
    Write-Error "Thư mục hiện tại không phải là Git repository!"
    exit 1
}
Write-Host "* Nhánh hiện tại: $currentBranch" -ForegroundColor Blue

# 2. Kiểm tra Remote tp
$tpUrl = (git remote get-url $RemoteName 2>$null)
if (-not $tpUrl) {
    Write-Host "* Chưa tìm thấy remote '$RemoteName'. Đang tự động thêm remote upstream..." -ForegroundColor Yellow
    git remote add $RemoteName $UpstreamUrl
} else {
    Write-Host "* Đã tìm thấy remote '$RemoteName': $tpUrl" -ForegroundColor Green
}

# 3. Fetch remote
Write-Host "* Đang fetch tags & nhánh mới nhất từ '$RemoteName'..." -ForegroundColor Blue
git fetch $RemoteName --tags --prune

# 4. Xác định TARGET_REF
if (-not $TargetRef) {
    $TargetRef = $DefaultTarget
}

$candidates = @($TargetRef, "v$TargetRef", "v2.$($TargetRef -replace '^2\.', '')", "v2.2$($TargetRef -replace '^2\.', '')")
if ($TargetRef -eq "2.8.1" -or $TargetRef -eq "v2.8.1") {
    $candidates = @("v2.28.1") + $candidates
}

$resolvedRef = ""
foreach ($cand in $candidates) {
    git rev-parse --verify --quiet $cand 2>$null
    if ($LASTEXITCODE -eq 0) {
        $resolvedRef = $cand
        break
    }
    git rev-parse --verify --quiet "$RemoteName/$cand" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $resolvedRef = "$RemoteName/$cand"
        break
    }
}

if (-not $resolvedRef) {
    Write-Error "Không tìm thấy ref/tag/nhánh '$TargetRef' trong repository hoặc remote '$RemoteName'!"
    exit 1
}

$resolvedCommit = (git rev-parse $resolvedRef).Trim()
Write-Host "* Mục tiêu update: $resolvedRef ($($resolvedCommit.Substring(0, 8)))" -ForegroundColor Green

# 5. Lưu SHA submodule content
$origContentSha = (git rev-parse HEAD:content 2>$null)
if ($origContentSha) {
    $origContentSha = $origContentSha.Trim()
    Write-Host "* Submodule content SHA hiện tại: $($origContentSha.Substring(0, 8))" -ForegroundColor Blue
}

# 6. Kiểm tra dirty working tree
git config submodule.content.ignore all
$dirty = (git status --porcelain -uno --ignore-submodules=all 2>$null)
if ($dirty) {
    Write-Host "[CẢNH BÁO] Working tree đang có file mã nguồn chưa commit:" -ForegroundColor Red
    $dirty | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    Write-Error "Vui lòng commit hoặc git stash trước khi chạy update."
    exit 1
}

# 7. Kiểm tra merge base
$mergeBase = (git merge-base HEAD $resolvedRef 2>$null).Trim()
if ($mergeBase -eq $resolvedCommit) {
    Write-Host "Nhánh hiện tại đã có đầy đủ commit từ $resolvedRef. Không có gì cần cập nhật!" -ForegroundColor Green
    exit 0
}

Write-Host "* Bắt đầu merge từ $resolvedRef (bảo lưu content)..." -ForegroundColor Blue

# 8. Merge no-commit
git merge --no-commit --no-ff $resolvedRef 2>$null

# 9. Dọn dẹp conflict content
Write-Host "* Tự động giải quyết conflict thư mục content (giữ nguyên content)..." -ForegroundColor Blue
git rm -rf --ignore-unmatch content/ 2>$null | Out-Null
git rm -rf --ignore-unmatch 'content~*' 2>$null | Out-Null
if (Test-Path "content~HEAD*") {
    Remove-Item -Recurse -Force "content~HEAD*" 2>$null
}

git reset HEAD -- content .gitmodules 2>$null | Out-Null
git checkout HEAD -- content .gitmodules 2>$null | Out-Null

if ($origContentSha) {
    git update-index --cacheinfo "160000,$origContentSha,content" 2>$null
}

# 10. Kiểm tra conflict ngoài content
$unmerged = (git diff --name-only --diff-filter=U 2>$null)
if ($unmerged) {
    Write-Host "[CẦN XỬ LÝ CONFLICT THỦ CÔNG NGOÀI CONTENT]" -ForegroundColor Red
    $unmerged | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    exit 1
}

# 11. Kiểm tra staged changes
git diff --cached --quiet 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Không có file mã nguồn nào thay đổi giữa HEAD và $resolvedRef." -ForegroundColor Yellow
    git merge --abort 2>$null
    exit 0
}

Write-Host "`n=== CÁC FILE MÃ NGUỒN ĐÃ ĐƯỢC CẬP NHẬT (STAGE) ===" -ForegroundColor Green
git diff --cached --stat

if ($NoCommit) {
    Write-Host "`nĐã merge thành công (--NoCommit). Bạn có thể kiểm tra 'git diff --cached' rồi tự commit." -ForegroundColor Yellow
    exit 0
}

$commitMsg = "chore: update Typemill source from $resolvedRef (preserve content submodule)"
git commit -m $commitMsg | Out-Null

$newHead = (git rev-parse --short HEAD).Trim()
Write-Host "`n✔ CẬP NHẬT THÀNH CÔNG!" -ForegroundColor Green
Write-Host "Commit mới: $newHead - $commitMsg"
Write-Host "Thư mục content hoàn toàn nguyên vẹn, không bị ảnh hưởng."

Write-Host "`nBước tiếp theo:" -ForegroundColor Blue
Write-Host "  - Đẩy lên repository của bạn: git push origin $currentBranch`n"
