# PowerShell script to check email delivery status using Message ID
# 
# Usage:
#   .\check-email-status-powershell.ps1 -MessageId "<message-id>"
#
# Example:
#   .\check-email-status-powershell.ps1 -MessageId "<5ff5771c-006b-1af5-da72-dea19f46c0cb@pryvegroup.com>"

param(
    [Parameter(Mandatory=$true)]
    [string]$MessageId,
    
    [Parameter(Mandatory=$false)]
    [string]$AdminEmail = "your_admin@yourdomain.com"
)

Write-Host "🔍 Checking Email Delivery Status..." -ForegroundColor Cyan
Write-Host "📧 Message ID: $MessageId" -ForegroundColor Yellow
Write-Host ""

# Connect to Exchange Online
Write-Host "🔐 Connecting to Exchange Online..." -ForegroundColor Cyan
try {
    Connect-ExchangeOnline -UserPrincipalName $AdminEmail -ShowProgress $false
    Write-Host "✅ Connected successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to connect: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Search for message trace
Write-Host "🔍 Searching for message trace..." -ForegroundColor Cyan
try {
    $results = Get-MessageTrace -MessageId $MessageId | Select-Object -First 10
    
    if ($results) {
        Write-Host "✅ Found message trace results:" -ForegroundColor Green
        Write-Host ""
        
        foreach ($result in $results) {
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
            Write-Host "📧 Message Details:" -ForegroundColor Cyan
            Write-Host "   Message ID: $($result.MessageId)" -ForegroundColor White
            Write-Host "   From: $($result.SenderAddress)" -ForegroundColor White
            Write-Host "   To: $($result.RecipientAddress)" -ForegroundColor White
            Write-Host "   Subject: $($result.Subject)" -ForegroundColor White
            Write-Host "   Status: $($result.Status)" -ForegroundColor $(if ($result.Status -eq "Delivered") { "Green" } else { "Yellow" })
            Write-Host "   Date: $($result.Received)" -ForegroundColor White
            
            if ($result.Status -eq "Delivered") {
                Write-Host "   ✅ Email was successfully delivered" -ForegroundColor Green
            } elseif ($result.Status -eq "Failed") {
                Write-Host "   ❌ Email delivery failed" -ForegroundColor Red
            } elseif ($result.Status -eq "Pending") {
                Write-Host "   ⏳ Email is still being processed" -ForegroundColor Yellow
            } elseif ($result.Status -eq "Filtered") {
                Write-Host "   🚫 Email was filtered by recipient server" -ForegroundColor Yellow
            }
            
            Write-Host ""
        }
    } else {
        Write-Host "⚠️  No message trace found for this Message ID" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Possible reasons:" -ForegroundColor Cyan
        Write-Host "   1. Message was sent more than 7 days ago (trace only keeps 7 days)" -ForegroundColor White
        Write-Host "   2. Message ID is incorrect" -ForegroundColor White
        Write-Host "   3. Message hasn't been processed yet (wait a few minutes)" -ForegroundColor White
        Write-Host ""
    }
} catch {
    Write-Host "❌ Error searching message trace: $_" -ForegroundColor Red
} finally {
    # Disconnect
    Write-Host "🔌 Disconnecting from Exchange Online..." -ForegroundColor Cyan
    Disconnect-ExchangeOnline -Confirm:$false
    Write-Host "✅ Disconnected" -ForegroundColor Green
}

Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor Cyan
Write-Host "   - Message trace only keeps data for 7 days" -ForegroundColor White
Write-Host "   - If status is 'Delivered', check recipient's spam folder" -ForegroundColor White
Write-Host "   - If status is 'Failed', check the error details above" -ForegroundColor White
Write-Host ""

