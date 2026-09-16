# Install and restart the Windows trial package in a disposable hosted-runner profile.
# The hosted runner has no reliable interactive desktop, so native shortcut, tray, and
# focus checks remain part of the installed-application walkthrough in Phase 11.
param(
  [Parameter(Mandatory = $true)][string]$Installer,
  [Parameter(Mandatory = $true)][string]$Output
)

$ErrorActionPreference = "Stop"
if ($env:GITHUB_ACTIONS -ne "true") {
  throw "This script is destructive to an installation. Run it only on a disposable GitHub-hosted runner."
}
$installerPath = (Resolve-Path $Installer).Path
$outputPath = [System.IO.Path]::GetFullPath($Output)
$data = Join-Path $env:APPDATA "com.konzendi.app"
if (Test-Path $data) { throw "The disposable runner already has Konzendi application data." }
New-Item -ItemType Directory -Force $outputPath | Out-Null

Start-Process -FilePath $installerPath -ArgumentList "/S" -Wait
$executable = Get-ChildItem $env:LOCALAPPDATA -Filter "Konzendi.exe" -Recurse -File |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $executable) { throw "The NSIS installer did not install Konzendi.exe." }

$device = Join-Path $data "device.json"
function Start-And-WaitForStore {
  $process = Start-Process -FilePath $executable -PassThru
  for ($attempt = 0; $attempt -lt 40 -and -not (Test-Path $device); $attempt += 1) {
    Start-Sleep -Milliseconds 250
  }
  if (-not (Test-Path $device)) {
    if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
    throw "Konzendi did not create its application data directory."
  }
  Start-Sleep -Milliseconds 500
  if ($process.HasExited) { throw "Konzendi exited during startup." }
  Stop-Process -Id $process.Id -Force
}

Start-And-WaitForStore
$identity = Get-Content $device -Raw
Start-And-WaitForStore
if ((Get-Content $device -Raw) -ne $identity) { throw "The device identity changed after restart." }

$uninstaller = Get-ChildItem (Split-Path $executable) -Filter "uninstall.exe" -File |
  Select-Object -First 1 -ExpandProperty FullName
if (-not $uninstaller) { throw "The per-user installation has no uninstaller." }
Start-Process -FilePath $uninstaller -ArgumentList "/S" -Wait
if (-not (Test-Path $device)) { throw "Package removal deleted the event-store identity." }

@{
  package = Split-Path $installerPath -Leaf
  executable = $executable
  data = $data
  identityPreservedAfterRestart = $true
  dataPreservedAfterRemoval = $true
} | ConvertTo-Json | Set-Content (Join-Path $outputPath "windows-smoke.json")
