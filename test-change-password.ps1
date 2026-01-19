# Test Change Password API with user account
$baseUrl = "http://localhost:5000/api"

# Login with user account
Write-Host "=== Step 1: Login ===" -ForegroundColor Cyan
$loginBody = @{
    email = "hovanquocthang1708@gmail.com"
    password = "Test123!@"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "User: $($loginResponse.data.user.name)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Test 1: Change password with WRONG current password
Write-Host "=== Test 1: Wrong Current Password ===" -ForegroundColor Cyan
Write-Host "Trying to change password with wrong current password..." -ForegroundColor Gray
$wrongPasswordBody = @{
    currentPassword = "WrongPassword999"
    newPassword = "NewTest123!@"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/change-password" -Method PUT -Body $wrongPasswordBody -Headers $headers -ErrorAction Stop
    Write-Host "❌ TEST FAILED: API accepted wrong password!" -ForegroundColor Red
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Red
    Write-Host ""
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "✅ TEST PASSED: API correctly rejected wrong password" -ForegroundColor Green
        Write-Host "Status: 400 Bad Request" -ForegroundColor Gray
        Write-Host "Message: $($errorResponse.message)" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "⚠️  Unexpected status code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        Write-Host "Error: $_" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Test 2: Change password with CORRECT current password
Write-Host "=== Test 2: Correct Current Password ===" -ForegroundColor Cyan
Write-Host "Changing password with correct current password..." -ForegroundColor Gray
$correctPasswordBody = @{
    currentPassword = "Test123!@"
    newPassword = "NewTest123!@"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/change-password" -Method PUT -Body $correctPasswordBody -Headers $headers -ErrorAction Stop
    if ($response.success) {
        Write-Host "✅ TEST PASSED: Password changed successfully" -ForegroundColor Green
        Write-Host "Message: $($response.message)" -ForegroundColor Gray
        Write-Host ""
        
        # Revert password
        Write-Host "=== Reverting Password ===" -ForegroundColor Cyan
        $revertBody = @{
            currentPassword = "NewTest123!@"
            newPassword = "Test123!@"
        } | ConvertTo-Json
        
        $revertResponse = Invoke-RestMethod -Uri "$baseUrl/auth/change-password" -Method PUT -Body $revertBody -Headers $headers -ErrorAction Stop
        Write-Host "✅ Password reverted to original" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "❌ Response indicated failure" -ForegroundColor Red
        Write-Host ""
    }
} catch {
    Write-Host "❌ TEST FAILED: Should have succeeded with correct password" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
}

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Check backend terminal for detailed logs with emoji indicators" -ForegroundColor Gray
Write-Host "Look for: 🔐 ✅ ❌ symbols in the logs" -ForegroundColor Gray
