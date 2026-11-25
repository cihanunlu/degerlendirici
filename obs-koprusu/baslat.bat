@echo off
rem Windows: cift tiklayarak acin.
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 goto python
py -3 baslat.py %*
goto son
:python
where python >nul 2>nul
if errorlevel 1 goto yok
python baslat.py %*
goto son
:yok
echo Python bulunamadi. https://www.python.org/downloads/ adresinden 3.10 veya ustunu kurun.
:son
pause
