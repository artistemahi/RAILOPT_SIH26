$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Status {
  param(
    [string]$Name,
    [string]$Message,
    [string]$Color = "Gray"
  )
  Write-Host ("[{0}] {1}: {2}" -f $Color.ToUpper(), $Name, $Message) -ForegroundColor $Color
}

function Test-Port {
  param([int]$Port)
  return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Start-ServiceIfNeeded {
  param(
    [string]$Name,
    [int]$Port,
    [string]$WorkingDirectory,
    [string]$Command
  )

  if (Test-Port $Port) {
    Write-Status $Name ("port {0} already in use; reusing existing process" -f $Port) "Green"
    return
  }

  try {
    Start-Process -FilePath "powershell.exe" `
      -WorkingDirectory $WorkingDirectory `
      -ArgumentList @("-NoExit", "-Command", $Command) | Out-Null
    Write-Status $Name ("starting on port {0}" -f $Port) "Yellow"
  } catch {
    Write-Status $Name ("failed to start: {0}" -f $_.Exception.Message) "Red"
    throw
  }
}

function Wait-ForHttp {
  param(
    [string]$Name,
    [string]$Url,
    [int]$Attempts = 100
  )

  for ($attempt = 0; $attempt -lt $Attempts; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        Write-Status $Name ("healthy at {0}" -f $Url) "Green"
        return $true
      }
    } catch {
      # The process may still be starting; continue bounded polling.
    }
  }

  Write-Status $Name ("health check failed at {0}" -f $Url) "Red"
  return $false
}

Write-Host ""
Write-Host "RAILOPT SIH Demo Startup" -ForegroundColor Cyan
Write-Host "Root: $root" -ForegroundColor DarkGray
Write-Host ""

$apiDirectory = Join-Path $root "services\api"
$mlDirectory = Join-Path $root "services\ml"
$optimizerDirectory = Join-Path $root "services\optimizer"
$webDirectory = Join-Path $root "apps\web"

Start-ServiceIfNeeded "Node API" 5000 $apiDirectory "npm run dev"
Start-ServiceIfNeeded "ML service" 8001 $mlDirectory ".venv\Scripts\python.exe -m uvicorn railopt_ml.app:app --app-dir src --port 8001"
Start-ServiceIfNeeded "Optimizer" 8002 $optimizerDirectory ".venv\Scripts\python.exe -m uvicorn railopt_optimizer.app:app --app-dir src --port 8002"
Start-ServiceIfNeeded "Frontend" 5173 $webDirectory "npm run dev"

Write-Host ""
Write-Host "Required service health" -ForegroundColor Cyan
$requiredHealthy = $true
$requiredHealthy = (Wait-ForHttp "Node API" "http://localhost:5000/health") -and $requiredHealthy
$requiredHealthy = (Wait-ForHttp "PostgreSQL via Node" "http://localhost:5000/api/db-test") -and $requiredHealthy
$requiredHealthy = (Wait-ForHttp "ML service" "http://localhost:8001/health") -and $requiredHealthy
$requiredHealthy = (Wait-ForHttp "Optimizer" "http://localhost:8002/health") -and $requiredHealthy
$requiredHealthy = (Wait-ForHttp "Frontend" "http://localhost:5173/") -and $requiredHealthy

Write-Host ""
Write-Host "Optional service status" -ForegroundColor Cyan
if (Test-Port 6379) {
  Write-Status "Redis" "available on port 6379" "Green"
} else {
  Write-Status "Redis" "not running; API fallback remains available" "Yellow"
}
if (Test-Port 9000) {
  Write-Status "MinIO" "available on port 9000" "Green"
} else {
  Write-Status "MinIO" "not running; object-storage test remains optional" "Yellow"
}

Write-Host ""
if (-not $requiredHealthy) {
  Write-Status "Demo" "startup failed because a required service health check failed" "Red"
  exit 1
}

Write-Status "Demo" "ready at http://localhost:5173/dashboard" "Green"
Write-Host "Open the Dashboard, Risk & Priority, and Block Planner pages for the SIH demo." -ForegroundColor Cyan
Write-Host "Press Ctrl+C in each service window to stop the demo processes." -ForegroundColor DarkGray
