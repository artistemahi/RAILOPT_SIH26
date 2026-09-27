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

  if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  }

  # Fallback for hosts without the NetTCPIP module.
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    return $client.ConnectAsync("localhost", $Port).Wait(500) -and $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Get-PythonLauncher {
  if (Get-Command py -ErrorAction SilentlyContinue) { return ,@("py", "-3") }
  if (Get-Command python -ErrorAction SilentlyContinue) { return ,@("python") }
  if (Get-Command python3 -ErrorAction SilentlyContinue) { return ,@("python3") }
  return $null
}

function Get-VenvPython {
  param([string]$ServiceDirectory)
  $windowsPath = Join-Path $ServiceDirectory ".venv\Scripts\python.exe"
  if (Test-Path $windowsPath) { return $windowsPath }
  return Join-Path $ServiceDirectory ".venv/bin/python"
}

function Install-NodeDependencies {
  param(
    [string]$Name,
    [string]$Directory
  )

  if (Test-Path (Join-Path $Directory "node_modules")) {
    Write-Status $Name "dependencies present" "Green"
    return $true
  }

  Write-Status $Name "installing npm dependencies (first run)" "Yellow"
  Push-Location $Directory
  try {
    & npm install
    $ok = $LASTEXITCODE -eq 0
  } finally {
    Pop-Location
  }

  if (-not $ok) { Write-Status $Name "npm install failed" "Red" }
  return $ok
}

function Install-PythonDependencies {
  param(
    [string]$Name,
    [string]$Directory
  )

  $requirements = Join-Path $Directory "requirements.txt"
  $venv = Join-Path $Directory ".venv"
  $stamp = Join-Path $venv ".requirements.sha256"

  if (-not (Test-Path $venv)) {
    $launcher = Get-PythonLauncher
    if (-not $launcher) {
      Write-Status $Name "Python 3 was not found on PATH; install Python 3.10+" "Red"
      return $false
    }

    Write-Status $Name "creating virtual environment" "Yellow"
    $launcherArgs = @()
    if ($launcher.Length -gt 1) { $launcherArgs = $launcher[1..($launcher.Length - 1)] }
    & $launcher[0] @launcherArgs -m venv $venv
    if ($LASTEXITCODE -ne 0) {
      Write-Status $Name "failed to create virtual environment" "Red"
      return $false
    }
  }

  # Reinstall only when requirements.txt changed since the last successful install.
  $hash = (Get-FileHash $requirements -Algorithm SHA256).Hash
  if ((Test-Path $stamp) -and ((Get-Content $stamp -Raw).Trim() -eq $hash)) {
    Write-Status $Name "dependencies present" "Green"
    return $true
  }

  Write-Status $Name "installing Python dependencies" "Yellow"
  $python = Get-VenvPython $Directory
  & $python -m pip install -r $requirements
  if ($LASTEXITCODE -ne 0) {
    Write-Status $Name "pip install failed" "Red"
    return $false
  }

  Set-Content -Path $stamp -Value $hash
  return $true
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

  # Launch each service in a new window of the same PowerShell edition running this script.
  $shell = (Get-Process -Id $PID).Path
  $windowCommand = "`$Host.UI.RawUI.WindowTitle = 'RAILOPT - $Name'; $Command"

  try {
    Start-Process -FilePath $shell `
      -WorkingDirectory $WorkingDirectory `
      -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $windowCommand) | Out-Null
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
    [int]$TimeoutSeconds = 120,
    [string]$Hint = ""
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
        Write-Status $Name ("healthy at {0}" -f $Url) "Green"
        return $true
      }
    } catch {
      # The process may still be starting; keep polling until the deadline.
    }
    Start-Sleep -Seconds 1
  }

  Write-Status $Name ("health check failed at {0} after {1}s" -f $Url, $TimeoutSeconds) "Red"
  if ($Hint) { Write-Host ("        {0}" -f $Hint) -ForegroundColor DarkYellow }
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

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Status "Node.js" "npm was not found on PATH; install Node.js 20+" "Red"
  exit 1
}

Write-Host "Dependencies" -ForegroundColor Cyan
$depsReady = $true
$depsReady = (Install-NodeDependencies "Node API" $apiDirectory) -and $depsReady
$depsReady = (Install-NodeDependencies "Frontend" $webDirectory) -and $depsReady
$depsReady = (Install-PythonDependencies "ML service" $mlDirectory) -and $depsReady
$depsReady = (Install-PythonDependencies "Optimizer" $optimizerDirectory) -and $depsReady

if (-not $depsReady) {
  Write-Host ""
  Write-Status "Demo" "dependency installation failed; fix the errors above and rerun" "Red"
  exit 1
}

$apiEnv = Join-Path $apiDirectory ".env"
if (-not (Test-Path $apiEnv)) {
  Copy-Item (Join-Path $apiDirectory ".env.example") $apiEnv
  Write-Status "Node API" "created services\api\.env from .env.example; set DATABASE_URL for your PostgreSQL" "Yellow"
}

$webEnv = Join-Path $webDirectory ".env"
if (-not (Test-Path $webEnv)) {
  Copy-Item (Join-Path $webDirectory ".env.example") $webEnv
  Write-Status "Frontend" "created apps\web\.env from .env.example" "Yellow"
}

$mlPython = Get-VenvPython $mlDirectory
$optimizerPython = Get-VenvPython $optimizerDirectory

Write-Host ""
Write-Host "Services" -ForegroundColor Cyan
Start-ServiceIfNeeded "Node API" 5000 $apiDirectory "npm run dev"
Start-ServiceIfNeeded "ML service" 8001 $mlDirectory "& '$mlPython' -m uvicorn railopt_ml.app:app --app-dir src --port 8001"
Start-ServiceIfNeeded "Optimizer" 8002 $optimizerDirectory "& '$optimizerPython' -m uvicorn railopt_optimizer.app:app --app-dir src --port 8002"
Start-ServiceIfNeeded "Frontend" 5173 $webDirectory "npm run dev"

Write-Host ""
Write-Host "Required service health" -ForegroundColor Cyan
$requiredHealthy = $true
$requiredHealthy = (Wait-ForHttp "Node API" "http://localhost:5000/health" -Hint "Check the 'RAILOPT - Node API' window for errors.") -and $requiredHealthy
$requiredHealthy = (Wait-ForHttp "PostgreSQL via Node" "http://localhost:5000/api/db-test" -TimeoutSeconds 15 -Hint "Start PostgreSQL and check DATABASE_URL in services\api\.env.") -and $requiredHealthy
$requiredHealthy = (Wait-ForHttp "ML service" "http://localhost:8001/health" -Hint "Check the 'RAILOPT - ML service' window for errors.") -and $requiredHealthy
$requiredHealthy = (Wait-ForHttp "Optimizer" "http://localhost:8002/health" -Hint "Check the 'RAILOPT - Optimizer' window for errors.") -and $requiredHealthy
$requiredHealthy = (Wait-ForHttp "Frontend" "http://localhost:5173/" -Hint "Check the 'RAILOPT - Frontend' window for errors.") -and $requiredHealthy

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

Write-Status "Demo" "ready at http://localhost:5173/overview" "Green"
Write-Host "Demo flow: Planning Run -> Versions & Approval -> Replanning -> Monthly Plan (see README)." -ForegroundColor Cyan
Write-Host "Close each 'RAILOPT - ...' window (or press Ctrl+C in it) to stop the demo processes." -ForegroundColor DarkGray
