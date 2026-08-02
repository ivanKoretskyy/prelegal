$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$ImageName = "prelegal"
$ContainerName = "prelegal"
$VolumeName = "prelegal-data"
$Port = 8000

Write-Host "Building $ImageName image..."
docker build -t $ImageName .

$existing = docker ps -a --format '{{.Names}}' | Select-String -Pattern "^$ContainerName$"
if ($existing) {
    Write-Host "Removing existing $ContainerName container..."
    docker rm -f $ContainerName | Out-Null
}

if (-not (Test-Path .env)) {
    New-Item -ItemType File -Path .env | Out-Null
}

$envContent = Get-Content .env -Raw -ErrorAction SilentlyContinue
if (-not $envContent) { $envContent = "" }

if ($envContent -notmatch '(?m)^SESSION_SECRET_KEY=') {
    $bytes = [byte[]]::new(32)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $secret = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
    # Ensure the file ends with a newline first -- appending onto a file
    # that doesn't would merge this line with the previous one.
    if ($envContent.Length -gt 0 -and -not ($envContent.EndsWith("`n"))) {
        Add-Content .env ""
    }
    Add-Content .env "SESSION_SECRET_KEY=$secret"
    Write-Host "Generated a new SESSION_SECRET_KEY in .env -- keep it stable across restarts, or all existing sessions and saved documents become inaccessible."
}

if ($envContent -notmatch '(?m)^OPENROUTER_API_KEY=') {
    Write-Warning "OPENROUTER_API_KEY not set in .env -- AI chat won't work."
}

docker volume create $VolumeName | Out-Null

Write-Host "Starting $ContainerName on port $Port..."
docker run -d --name $ContainerName --env-file .env -v "${VolumeName}:/app/data" -p "${Port}:8000" $ImageName

Write-Host "Backend available at http://localhost:$Port"
