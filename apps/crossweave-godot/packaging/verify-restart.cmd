@echo off
cd /d "%~dp0"
"Crossweave.Proof.exe" --headless -- --probe-write=41 --probe-slot=windows-check
if errorlevel 1 goto failed
"Crossweave.Proof.exe" --headless -- --expect-probe=41 --probe-slot=windows-check
if errorlevel 1 goto failed
"Crossweave.Proof.exe" --headless -- --probe-fail-write --probe-slot=windows-check
if errorlevel 1 goto failed
echo PASS: dedicated state read in a new process. GUI and performance remain unchecked.
echo Reports: %APPDATA%\crossweave\proofs\rd-proof-02\windows-check
pause
exit /b 0
:failed
echo FAILED. Preserve the reports and error text; no GUI success is implied.
pause
exit /b 1
