@echo off
REM Apply the Supabase schema automatically (for Windows CI or local dev)
if "%SUPABASE_CONNECTION_STRING%"=="" (
  echo Please set SUPABASE_CONNECTION_STRING env var.
  exit /b 1
)
psql "%SUPABASE_CONNECTION_STRING%" -f supabase/schema.sql
