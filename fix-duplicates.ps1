$filePath = "d:\a20\fund-it\src\assets\account-details.mock.json"
$content = Get-Content $filePath -Raw
# Remove duplicate fields
$content = $content -replace '"paid_amount": 0, "balance_amount": 0, "paid_amount": 0, "balance_amount": 0,', '"paid_amount": 0, "balance_amount": 0,'
$content | Set-Content $filePath -NoNewline
Write-Host "Cleaned up duplicate fields"

