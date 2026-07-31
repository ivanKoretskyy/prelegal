$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$ImageName = "prelegal"
$ContainerName = "prelegal"
$Port = 8000

Write-Host "Building $ImageName image..."
docker build -t $ImageName .

$existing = docker ps -a --format '{{.Names}}' | Select-String -Pattern "^$ContainerName$"
if ($existing) {
    Write-Host "Removing existing $ContainerName container..."
    docker rm -f $ContainerName | Out-Null
}

Write-Host "Starting $ContainerName on port $Port..."
docker run -d --name $ContainerName -p "${Port}:8000" $ImageName

Write-Host "Backend available at http://localhost:$Port"
