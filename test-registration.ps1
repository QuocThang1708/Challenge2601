# Test Registration API

Write-Host "==================================" -ForegroundColor Green
Write-Host "TEST 1: Valid Registration" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

$body = @{
    name = "Nguyễn Văn Test"
    email = "test@congdoan.vn"
    phone = "0909123456"
    employeeId = "CB9999"
    password = "test123"
    department = "IT"
    position = "Developer"
    gender = "Nam"
    birthDate = "1995-05-15"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "❌ ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host "`n==================================" -ForegroundColor Yellow
Write-Host "TEST 2: Missing Required Field (phone)" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$bodyInvalid = @{
    name = "Test Invalid"
    email = "invalid@test.com"
    employeeId = "CB8888"
    password = "test123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $bodyInvalid -ContentType "application/json"
    Write-Host "Response:" ($response | ConvertTo-Json)
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✅ Validation works!" -ForegroundColor Green
    Write-Host "Error message:" $errorResponse.message
}

Write-Host "`n==================================" -ForegroundColor Yellow
Write-Host "TEST 3: Invalid Email Format" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$bodyInvalidEmail = @{
    name = "Test Invalid Email"
    email = "not-an-email"
    phone = "0909999999"
    employeeId = "CB7777"
    password = "test123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $bodyInvalidEmail -ContentType "application/json"
    Write-Host "Response:" ($response | ConvertTo-Json)
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✅ Email validation works!" -ForegroundColor Green
    Write-Host "Error message:" $errorResponse.message
}

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "DONE! Check backend console for verification code" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
