$baseUrl = "http://localhost:5000/api"

# Login
$loginBody = '{"email":"hovanquocthang1708@gmail.com","password":"Test123!@"}'
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token

Write-Host "Logged in as: $($loginResponse.data.user.name)" -ForegroundColor Green

# Test with WRONG password
Write-Host "`nTest: Changing password with WRONG current password" -ForegroundColor Yellow
$wrongBody = '{"currentPassword":"WrongPassword999","newPassword":"NewTest123!@"}'
$headers = @{"Authorization"="Bearer $token";"Content-Type"="application/json"}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/change-password" -Method PUT -Body $wrongBody -Headers $headers -ErrorAction Stop
    Write-Host "FAIL: API accepted wrong password!" -ForegroundColor Red
    Write-Host $response -ForegroundColor Red
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($err.message -eq "Mật khẩu hiện tại không đúng") {
        Write-Host "PASS: API rejected wrong password correctly" -ForegroundColor Green
        Write-Host "Error message: $($err.message)" -ForegroundColor Gray
    } else {
        Write-Host "FAIL: Wrong error message: $($err.message)" -ForegroundColor Red
    }
}
