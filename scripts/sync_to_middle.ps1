# ==============================================================================
# Script: sync_to_middle.ps1
# Mục đích: [PowerShell cho Windows/WSL] 1-Click đồng bộ local -> middle_sync -> git content
# Sử dụng:
#   .\scripts\sync_to_middle.ps1
#   .\scripts\sync_to_middle.ps1 -Prod
#   .\scripts\sync_to_middle.ps1 -Message "Cập nhật bài viết mới"
# ==============================================================================

param(
    [switch]$Prod,
    [string]$Message = ""
)

$baseDir = Split-Path -Parent $PSScriptRoot
Set-Location $baseDir

$prodArg = if ($Prod) { "--prod" } else { "" }
$msgArg = if ($Message -ne "") { "-m `"$Message`"" } else { "" }

wsl bash -c "$baseDir/scripts/sync_to_middle.sh $prodArg $msgArg"
