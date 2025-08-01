# Fix double backticks in JavaScript files
$files = Get-ChildItem -Path "zebrafish-frontend\src" -Recurse -Filter "*.js"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match '``\$\{') {
        $fixedContent = $content -replace '``\$\{', '`${'
        Set-Content -Path $file.FullName -Value $fixedContent -NoNewline
        Write-Host "Fixed: $($file.Name)"
    }
}
