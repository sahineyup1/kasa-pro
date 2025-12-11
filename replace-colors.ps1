$srcPath = "C:\Users\Sahin\Desktop\kasa-pro\src"

Get-ChildItem -Path $srcPath -Recurse -Filter "*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -Encoding UTF8
    $newContent = $content `
        -replace 'blue-50', 'amber-50' `
        -replace 'blue-100', 'amber-100' `
        -replace 'blue-200', 'amber-200' `
        -replace 'blue-300', 'amber-300' `
        -replace 'blue-400', 'amber-400' `
        -replace 'blue-500', 'amber-500' `
        -replace 'blue-600', 'amber-600' `
        -replace 'blue-700', 'amber-700' `
        -replace 'blue-800', 'amber-800' `
        -replace 'blue-900', 'amber-900'

    if ($content -ne $newContent) {
        Set-Content $_.FullName -Value $newContent -NoNewline -Encoding UTF8
        Write-Host "Updated: $($_.FullName)"
    }
}

Write-Host "Done!"
