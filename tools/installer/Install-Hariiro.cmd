@echo off
rem Hariiro installer (prototype): double-click to install into foobar2000.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Hariiro.ps1" %*
pause
