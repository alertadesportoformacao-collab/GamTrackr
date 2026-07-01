@echo off
setlocal

set ENV=%1

if "%ENV%"=="" (
    echo Uso: env-switch [dev^|staging^|prod]
    echo.
    echo  env-switch dev      ^> branch dev    + BD de dev
    echo  env-switch staging  ^> branch staging + BD de staging
    echo  env-switch prod     ^> branch main   + BD de producao
    goto :end
)

if "%ENV%"=="dev" (
    set BRANCH=dev
    set ENVFILE=.env.dev
) else if "%ENV%"=="staging" (
    set BRANCH=staging
    set ENVFILE=.env.staging
) else if "%ENV%"=="prod" (
    set BRANCH=main
    set ENVFILE=.env.production
) else (
    echo Ambiente invalido: %ENV%
    echo Use: dev, staging ou prod
    goto :end
)

if not exist "%ENVFILE%" (
    echo Ficheiro %ENVFILE% nao encontrado.
    echo Cria-o com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
    goto :end
)

git checkout %BRANCH%
copy /Y "%ENVFILE%" ".env" >nul

echo.
echo Ambiente: %ENV%
echo Branch:   %BRANCH%
echo BD:       (ver .env)
echo Pronto.

:end
endlocal
