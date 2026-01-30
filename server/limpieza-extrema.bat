@echo off
echo ============================================
echo LIMPIEZA EXTREMA - Node.js Cache
echo ============================================
echo.

echo [PASO 1] Matando TODOS los procesos de Node.js...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
taskkill /F /IM npx.exe 2>nul
timeout /t 3 /nobreak >nul
echo   ✓ Procesos detenidos

echo.
echo [PASO 2] Eliminando node_modules...
if exist node_modules (
    echo   Borrando node_modules...
    rmdir /s /q node_modules
    echo   ✓ node_modules eliminado
)

echo.
echo [PASO 3] Eliminando package-lock.json...
if exist package-lock.json (
    del package-lock.json
    echo   ✓ package-lock.json eliminado
)

echo.
echo [PASO 4] Limpiando cache de npm...
call npm cache clean --force
echo   ✓ Cache de npm limpiado

echo.
echo [PASO 5] Eliminando cache de Node.js del usuario...
if exist "%LOCALAPPDATA%\npm-cache" (
    rmdir /s /q "%LOCALAPPDATA%\npm-cache"
    echo   ✓ npm-cache local eliminado
)
if exist "%APPDATA%\npm-cache" (
    rmdir /s /q "%APPDATA%\npm-cache"
    echo   ✓ npm-cache appdata eliminado
)

echo.
echo [PASO 6] Eliminando .cache del proyecto...
if exist .cache (
    rmdir /s /q .cache
    echo   ✓ .cache eliminado
)
if exist server\.cache (
    rmdir /s /q server\.cache
    echo   ✓ server\.cache eliminado
)

echo.
echo [PASO 7] Eliminando archivos temporales de Windows...
if exist "%TEMP%\npm-*" (
    del /s /q "%TEMP%\npm-*" 2>nul
    echo   ✓ Temporales de npm eliminados
)

echo.
echo [PASO 8] Reinstalando dependencias DESDE CERO...
call npm install
echo   ✓ Dependencias reinstaladas

echo.
echo ============================================
echo ✓✓✓ LIMPIEZA COMPLETA TERMINADA ✓✓✓
echo ============================================
echo.
echo IMPORTANTE: Antes de ejecutar npm run dev:
echo 1. Verifica que server/routes/yfRoutes.cjs exista (minusculas)
echo 2. Verifica que server/index.mjs tenga: import("./routes/yfRoutes.cjs")
echo 3. Cierra VSCode completamente y vuelve a abrirlo
echo.
pause
