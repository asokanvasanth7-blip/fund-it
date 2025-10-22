$filePath = "d:\a20\fund-it\src\assets\account-details.mock.json"
$content = Get-Content $filePath -Raw
$content = $content -replace '"payment_status": "pending"\}', '"paid_amount": 0, "balance_amount": 0, "payment_status": "pending"}'
$content | Set-Content $filePath -NoNewline
Write-Host "Added paid_amount and balance_amount fields to all payment entries"

