# Update import paths in the real estate module files
$basePath = "src/apps/real-estate/app/(dashboard)/real-estate"

# Update dashboard page
$dashboardPage = "$basePath/dashboard/page.tsx"
(Get-Content $dashboardPage) | ForEach-Object {
    $_ -replace "@/components/", "@/apps/real-estate/components/"
} | Set-Content $dashboardPage

# Update new property page
$newPropertyPage = "$basePath/dashboard/properties/new/page.tsx"
(Get-Content $newPropertyPage) | ForEach-Object {
    $_ -replace "@/components/", "@/apps/real-estate/components/"
} | Set-Content $newPropertyPage

# Update property detail page
$propertyDetailPage = "$basePath/properties/[id]/page.tsx"
if (Test-Path $propertyDetailPage) {
    (Get-Content $propertyDetailPage) | ForEach-Object {
        $_ -replace "@/components/", "@/apps/real-estate/components/"
    } | Set-Content $propertyDetailPage
}

# Update search page
$searchPage = "$basePath/search/page.tsx"
(Get-Content $searchPage) | ForEach-Object {
    $_ -replace "@/components/", "@/apps/real-estate/components/"
} | Set-Content $searchPage

Write-Host "Import paths have been updated in all files."
