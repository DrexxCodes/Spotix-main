@echo off
title Spotix dev server launch
color 0a

echo Initializing Spotix App...
ping localhost -n 2 > nul

echo Loading up Vite...
ping localhost -n 2 > nul

echo Prepping up the Dev server...
ping localhost -n 2 > nul

setlocal enabledelayedexpansion
set "bar="
for /L %%i in (1,1,20) do (
    set "bar=!bar!#"
    <nul set /p =[!bar!]%%i0%%
    ping localhost -n 1 > nul
)
echo.
echo Dev Server is Active🔥

start /B cmd /C "npm run dev"

ping localhost -n 6 >nul

start chrome http://localhost:5173

echo All set! The app is actively running🔥

pause