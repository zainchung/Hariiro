<#
Hariiro installer. Shipped at the top of the Hariiro ZIP, next to the Hariiro\ skin folder.
Double-click Install-Hariiro.cmd, or run:
  powershell -NoProfile -ExecutionPolicy Bypass -File Install-Hariiro.ps1 [-FoobarDir <folder with foobar2000.exe>] [-Yes] [-NoStart]

What it does, and nothing else:
  1. finds foobar2000 (-FoobarDir, else the running foobar2000.exe, else the standard install folders);
  2. closes foobar2000 (asks first; playback stops);
  3. copies each component in .\components\<name>\ to <profile>\user-components-x64\<name>\
     when foobar2000 does not have it yet (an installed component is never replaced);
  4. copies .\Hariiro\ to <profile>\foo_ui_panels-skins\Hariiro (an existing folder is first
     copied to Hariiro.backup-<time>);
  5. starts foobar2000 and says what to choose on its first start.
It never edits foobar2000's configuration or playlists.
#>
param([string]$FoobarDir, [switch]$Yes, [switch]$NoStart)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$source = Join-Path $here 'Hariiro'

function Find-Foobar {
  if ($FoobarDir) { return $FoobarDir }
  $p = Get-Process foobar2000 -ErrorAction SilentlyContinue | Where-Object { $_.Path } | Select-Object -First 1
  if ($p) { return Split-Path -Parent $p.Path }
  foreach ($d in "$env:ProgramFiles\foobar2000", "${env:ProgramFiles(x86)}\foobar2000", "$env:LOCALAPPDATA\Programs\foobar2000") {
    if ($d -and (Test-Path (Join-Path $d 'foobar2000.exe'))) { return $d }
  }
  return $null
}
function Confirm-Step([string]$question) {
  if ($Yes) { return $true }
  return (Read-Host "$question [y/N]") -match '^(y|yes)$'
}

if (-not (Test-Path (Join-Path $source 'main.txt'))) {
  throw "Hariiro\main.txt not found next to this script. Extract the whole ZIP first, then run the installer from the extracted folder."
}
$dir = Find-Foobar
if (-not $dir -or -not (Test-Path (Join-Path $dir 'foobar2000.exe'))) {
  throw 'foobar2000 not found. Start foobar2000 and run the installer again, or pass -FoobarDir "<folder with foobar2000.exe>".'
}
$exe = Join-Path $dir 'foobar2000.exe'
$portable = Test-Path (Join-Path $dir 'portable_mode_enabled')
$profileDir = if ($portable) { Join-Path $dir 'profile' } else { Join-Path $env:APPDATA 'foobar2000-v2' }
"foobar2000: $dir ($(if ($portable) { 'portable' } else { 'installed' }))"
"profile:    $profileDir"

$running = @(Get-Process foobar2000 -ErrorAction SilentlyContinue | Where-Object { $_.Path -and ((Split-Path -Parent $_.Path) -eq $dir) })
if ($running) {
  if (-not (Confirm-Step 'foobar2000 is running and has to close (playback stops). Close it now?')) { 'Cancelled, nothing changed.'; exit 1 }
  foreach ($p in $running) { $null = $p.CloseMainWindow(); if (-not $p.WaitForExit(15000)) { throw 'foobar2000 did not close within 15 s; nothing changed.' } }
}

# Components: only the ones foobar2000 does not have yet.
$newComponents = 0
$compSrc = Join-Path $here 'components'
$compDst = Join-Path $profileDir 'user-components-x64'
if (Test-Path $compSrc) {
  foreach ($c in Get-ChildItem $compSrc -Directory) {
    $target = Join-Path $compDst $c.Name
    if (Test-Path (Join-Path $target "$($c.Name).dll")) { "component $($c.Name): already installed, kept"; continue }
    $null = New-Item -ItemType Directory -Force $target
    Copy-Item (Join-Path $c.FullName "$($c.Name).dll") $target -Force
    "component $($c.Name): installed"
    $newComponents++
  }
}

# Skin.
$skin = Join-Path (Join-Path $profileDir 'foo_ui_panels-skins') 'Hariiro'
$fresh = -not (Test-Path (Join-Path $skin 'main.txt'))
if (Test-Path $skin) {
  $backup = "$skin.backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
  Copy-Item $skin $backup -Recurse
  "existing skin copied to $backup"
}
$null = New-Item -ItemType Directory -Force $skin
Copy-Item (Join-Path $source '*') $skin -Recurse -Force
"skin:       $skin"

''
if ($fresh -or $newComponents) {
  'On the first start of foobar2000:'
  '  1. "New user interface module(s) found": choose "Panels UI (reborn)" and click OK.'
  '  2. Menu View > Panels UI > Skins (the last entry): choose "Hariiro".'
  '     (Panels UI first opens its own layout wizard; Hariiro replaces it.)'
} else {
  'Hariiro updated. If foobar2000 does not show it, choose it in View > Panels UI > Skins.'
}
if (-not $NoStart) { Start-Process $exe; 'foobar2000 started.' }
