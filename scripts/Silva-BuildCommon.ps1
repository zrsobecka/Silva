$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CargoManifest = Join-Path $ProjectRoot "src-tauri\Cargo.toml"

function Initialize-SilvaBuild {
    if (-not $env:CARGO_TARGET_DIR) {
        $env:CARGO_TARGET_DIR = Join-Path $env:LOCALAPPDATA "Silva\cargo-target"
    }
}

function Invoke-SilvaStep {
    param([string]$Command, [string[]]$Arguments)

    Write-Host "==> $Command $($Arguments -join ' ')" -ForegroundColor Cyan
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Niepowodzenie kroku $Command (kod $LASTEXITCODE)."
    }
}
