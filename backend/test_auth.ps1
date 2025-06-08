# 1. Generate unique username with timestamp
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$username = "admin_$timestamp"

# Test user registration
$registerBody = @{
    username = $username
    password = "admin123"
    email = "${username}@example.com"
    role = "ADMIN"
} | ConvertTo-Json

Write-Host "Registering new user: $username..."
try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "Registration successful:" $registerResponse.message
} catch {
    Write-Host "Registration failed:" $_.Exception.Response.StatusCode
    Write-Host $_.ErrorDetails.Message
}

# Test user login
$loginBody = @{
    username = $username
    password = "admin123"
} | ConvertTo-Json

Write-Host "`nLogging in as $username..."
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    Write-Host "Login successful, token received"
} catch {
    Write-Host "Login failed:" $_.Exception.Response.StatusCode
    Write-Host $_.ErrorDetails.Message
    exit
}

# Test protected endpoint - Create rack
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$rackBody = @{
    lab_id = "lab_$timestamp"
    name = "Test Rack $timestamp"
    rows = 4
    columns = 6
} | ConvertTo-Json

Write-Host "`nCreating new rack..."
try {
    $rackResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/racks" -Method Post -Headers $headers -Body $rackBody
    Write-Host "Rack creation response:" $rackResponse.message
} catch {
    Write-Host "Rack creation failed:" $_.Exception.Response.StatusCode
    Write-Host $_.ErrorDetails.Message
}

# Test unauthorized access (optional)
Write-Host "`nTesting unauthorized access..."
try {
    $unauthorizedHeaders = @{
        "Content-Type" = "application/json"
    }
    $unauthorizedResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/racks" -Method Post -Headers $unauthorizedHeaders -Body $rackBody
} catch {
    Write-Host "Expected unauthorized error:" $_.Exception.Response.StatusCode
}