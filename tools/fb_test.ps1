<#
Windows test helper for the Hariiro skin in a real foobar2000 (portable or installed).
Short output on purpose: one line per fact, so an agent can read results without screenshots.

  & tools/fb_test.ps1 status              # skin vs repo, playlist counts, last JS log lines
  & tools/fb_test.ps1 backup  [-Name x]   # copy playlists-v2.0 to a backup (foobar keeps running)
  & tools/fb_test.ps1 deploy  [-Images]   # close foobar, copy js/, main.txt, ini (+images), start
  & tools/fb_test.ps1 restore [-Name x]   # close foobar, put the backup back, start
  & tools/fb_test.ps1 restart

foobar2000 folder: -FoobarDir, else $env:HARIIRO_FOOBAR_DIR (the folder holding foobar2000.exe).
Installed skin folder name: -SkinFolder, else $env:HARIIRO_SKIN_FOLDER, else 'Hariiro'.
Backups go to $env:TEMP\hariiro-tests\<Name> (default name: "last").
From bash, run it as: powershell -NoProfile -ExecutionPolicy Bypass -File tools/fb_test.ps1 status
#>
param(
  [Parameter(Position = 0)][ValidateSet('status', 'backup', 'deploy', 'restore', 'restart')][string]$Action = 'status',
  [string]$FoobarDir = $env:HARIIRO_FOOBAR_DIR,
  [string]$Name = 'last',
  [string]$SkinFolder = $(if ($env:HARIIRO_SKIN_FOLDER) { $env:HARIIRO_SKIN_FOLDER } else { 'Hariiro' }),
  [switch]$Images
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
if (-not $FoobarDir -or -not (Test-Path (Join-Path $FoobarDir 'foobar2000.exe'))) {
  throw 'foobar2000 not found: pass -FoobarDir or set $env:HARIIRO_FOOBAR_DIR to the folder with foobar2000.exe'
}
$exe = Join-Path $FoobarDir 'foobar2000.exe'
# Portable installs keep the profile next to the exe; installed ones use %APPDATA%.
$profileDir = if (Test-Path (Join-Path $FoobarDir 'portable_mode_enabled')) { Join-Path $FoobarDir 'profile' } else { Join-Path $env:APPDATA 'foobar2000-v2' }
$skin = Join-Path (Join-Path $profileDir 'foo_ui_panels-skins') $SkinFolder
$lists = Join-Path $profileDir 'playlists-v2.0'
$backup = Join-Path (Join-Path $env:TEMP 'hariiro-tests') $Name

function Stop-Foobar {
  $p = Get-Process foobar2000 -ErrorAction SilentlyContinue
  if (-not $p) { return }
  $null = $p.CloseMainWindow()   # graceful: lets foobar save its playlists
  if (-not $p.WaitForExit(15000)) { throw 'foobar2000 did not close within 15 s' }
}
function Start-Foobar {
  Start-Process $exe
  Start-Sleep -Seconds 4
  'foobar2000 running: pid ' + (Get-Process foobar2000 | Select-Object -First 1).Id
}
function Show-Playlists([string]$dir) {
  $names = @{}
  foreach ($line in Get-Content -Encoding utf8 (Join-Path $dir 'index.txt')) {
    if ($line -match '^([0-9A-F-]{36}):(.*)$') { $names[$Matches[1]] = $Matches[2] }
  }
  foreach ($id in $names.Keys) {
    $file = Join-Path $dir "playlist-$id.fplite"
    $n = if (Test-Path $file) { @(Get-Content -Encoding utf8 $file | Where-Object { $_ }).Count } else { '?' }
    '  {0,-34} {1,5}' -f $names[$id], $n
  }
}
function Show-SkinDiff {
  $diff = @()
  foreach ($f in Get-ChildItem (Join-Path $repo 'js') -Filter *.js) {
    $t = Join-Path $skin "js\$($f.Name)"
    if (-not (Test-Path $t)) { $diff += "missing $($f.Name)" }
    elseif ((Get-FileHash $f.FullName).Hash -ne (Get-FileHash $t).Hash) { $diff += "differs $($f.Name)" }
  }
  foreach ($f in 'main.txt', 'foo_ui_panels.ini') {
    if ((Get-FileHash (Join-Path $repo $f)).Hash -ne (Get-FileHash (Join-Path $skin $f)).Hash) { $diff += "differs $f" }
  }
  $extra = Get-ChildItem (Join-Path $skin 'js') -Filter *.js | Where-Object { -not (Test-Path (Join-Path $repo "js\$($_.Name)")) }
  foreach ($e in $extra) { $diff += "extra in skin $($e.Name)" }
  if ($diff) { 'skin vs repo: ' + ($diff -join ', ') } else { 'skin vs repo: identical' }
}

switch ($Action) {
  'status' {
    Show-SkinDiff
    'playlists:'; Show-Playlists $lists
    $log = Join-Path $profileDir 'foo_js_panel.log'
    if (Test-Path $log) {
      $session = Get-Content $log | Select-Object -Last 40
      $start = [array]::LastIndexOf($session, ($session | Where-Object { $_ -like '==== foo_js_panel session*' } | Select-Object -Last 1))
      $errors = $session[[Math]::Max(0, $start)..($session.Count - 1)] | Where-Object { $_ -match 'WARN|ERROR|Error|error' }
      if ($errors) { 'JS log (current session):'; $errors | ForEach-Object { '  ' + $_ } } else { 'JS log (current session): no warnings or errors' }
    }
    'foobar2000 running: ' + [bool](Get-Process foobar2000 -ErrorAction SilentlyContinue)
  }
  'backup' {
    if (Test-Path $backup) { Remove-Item $backup -Recurse -Force }
    $null = New-Item -ItemType Directory -Force (Split-Path $backup)
    Copy-Item $lists $backup -Recurse
    "backup '$Name' -> $backup"; Show-Playlists $backup
  }
  'deploy' {
    Stop-Foobar
    Copy-Item (Join-Path $repo 'js\*.js') (Join-Path $skin 'js') -Force
    Copy-Item (Join-Path $repo 'main.txt'), (Join-Path $repo 'foo_ui_panels.ini') $skin -Force
    if ($Images) { Copy-Item (Join-Path $repo 'images\*') (Join-Path $skin 'images') -Recurse -Force }
    Show-SkinDiff
    Start-Foobar
  }
  'restore' {
    if (-not (Test-Path (Join-Path $backup 'index.txt'))) { throw "no backup '$Name' at $backup" }
    Stop-Foobar
    $kept = "$backup-replaced"
    if (Test-Path $kept) { Remove-Item $kept -Recurse -Force }
    Move-Item $lists $kept          # the state being replaced stays recoverable
    Copy-Item $backup $lists -Recurse
    "restored '$Name' (replaced state kept at $kept)"; Show-Playlists $lists
    Start-Foobar
  }
  'restart' { Stop-Foobar; Start-Foobar }
}
