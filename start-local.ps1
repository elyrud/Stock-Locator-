$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $runtime = $nodeCommand.Source
} else {
    $runtime = Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'
    if (!(Test-Path -LiteralPath $runtime)) { throw 'Install Node.js 24 or later, then run npm start.' }
    $env:ELECTRON_RUN_AS_NODE = '1'
}
$dataPath = Join-Path $PSScriptRoot 'data'
New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
$pidPath = Join-Path $dataPath 'local-server.pid'
if (Test-Path -LiteralPath $pidPath) {
    $previous = Get-Process -Id ([int](Get-Content -LiteralPath $pidPath)) -ErrorAction SilentlyContinue
    if ($previous) { Write-Output 'The local server is already running. Open http://localhost:3000/login.html'; exit }
}
$process = Start-Process -FilePath $runtime -ArgumentList 'server.cjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $dataPath 'server.log') -RedirectStandardError (Join-Path $dataPath 'server-error.log') -PassThru
if ($process.WaitForExit(1500)) { throw ('Server could not start. See ' + (Join-Path $dataPath 'server-error.log')) }
$process.Id | Set-Content -LiteralPath $pidPath
Write-Output 'Staff sign in: http://localhost:3000/login.html'
Write-Output 'First visit: create your administrator account. Use Staff accounts to invite colleagues.'
Write-Output 'To stop this server, run .\stop-local.ps1'
