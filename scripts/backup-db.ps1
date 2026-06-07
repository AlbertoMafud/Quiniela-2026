# Backup de la BD de Supabase a un .sql con timestamp.
# Uso:
#   1) Asegurate que tienes pg_dump instalado:
#      winget install -e --id PostgreSQL.PostgreSQL.17
#      (te da pg_dump.exe en C:\Program Files\PostgreSQL\17\bin\)
#   2) Pega tu connection string de Supabase en $env:SUPABASE_DB_URL:
#      - Dashboard de Supabase -> Project Settings -> Database
#      - Connection string -> "URI" mode -> copia toda la cadena
#      - Asegurate de marcarla "Use connection pooling" en OFF (port 5432, no 6543)
#      - Reemplaza [YOUR-PASSWORD] por tu password real
#   3) Corre (Windows PowerShell 5.1 o 7):
#      .\scripts\backup-db.ps1
#
# Output: backups\quiniela-YYYY-MM-DD_HHmm.sql (UTF-8, solo schema public).
# Nota: pg_dump escribe el archivo con --file (UTF-8 correcto). NO usar `>`,
#       que en PowerShell 5.1 lo guarda en UTF-16 y corrompe acentos/emojis.

$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_DB_URL) {
    Write-Error "Falta env var SUPABASE_DB_URL. Lee el header de este script."
    exit 1
}

$pgDump = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
if (-not (Test-Path $pgDump)) {
    # fallback: busca cualquier version
    $found = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $pgDump = $found.FullName } else {
        Write-Error "No se encuentra pg_dump.exe. Instala PostgreSQL: winget install -e --id PostgreSQL.PostgreSQL.17"
        exit 1
    }
}

$backupDir = Join-Path $PSScriptRoot "..\backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$outFile = Join-Path $backupDir "quiniela-$stamp.sql"

Write-Host "Generando backup en $outFile ..."
& $pgDump --no-owner --no-acl --clean --if-exists --quote-all-identifiers --schema=public --file="$outFile" $env:SUPABASE_DB_URL

if ($LASTEXITCODE -eq 0) {
    $size = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
    Write-Host "OK. Backup de $size KB guardado." -ForegroundColor Green

    # Borra backups mayores a 30 dias
    Get-ChildItem $backupDir -Filter "quiniela-*.sql" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force
} else {
    Write-Error "pg_dump fallo con exit code $LASTEXITCODE"
    exit 1
}
