$ErrorActionPreference = 'Stop'
$pidPath = Join-Path $PSScriptRoot 'data\local-server.pid'
if (!(Test-Path -LiteralPath $pidPath)) { Write-Output 'No launcher-managed local server was found.'; exit }
$serverProcessId = [int](Get-Content -LiteralPath $pidPath)
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $serverProcessId"
if ($process) {
    if ($process.CommandLine -notmatch 'server\.cjs' -or $process.ExecutablePath -notmatch '(node|Code)\.exe$') { throw 'The recorded process is not the BEC TECH server; it has not been stopped.' }
    Stop-Process -Id $serverProcessId
}
Remove-Item -LiteralPath $pidPath
Write-Output 'Local BEC TECH server stopped.'
