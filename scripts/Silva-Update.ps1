[CmdletBinding()]
param([switch]$DesktopShortcut)

. "$PSScriptRoot\Silva-BuildCommon.ps1"
$previousTarget = $env:CARGO_TARGET_DIR
Push-Location $ProjectRoot
try {
    Initialize-SilvaBuild
    Invoke-SilvaStep npm.cmd @("run", "tauri", "--", "build", "--no-bundle", "--", "--locked")

    $build = Join-Path $env:CARGO_TARGET_DIR "release\silva.exe"
    $appDirectory = Join-Path $ProjectRoot "app"
    $destination = Join-Path $appDirectory "Silva.exe"
    $builtFile = Get-Item -LiteralPath $build
    $buildHash = (Get-FileHash -LiteralPath $build).Hash
    if ($builtFile.Length -eq 0) {
        throw "Kompilacja nie utworzyła prawidłowego pliku."
    }

    foreach ($process in (Get-Process -Name "silva" -ErrorAction SilentlyContinue)) {
        if ($process.Path -ne $destination) { continue }
        if (-not $process.CloseMainWindow() -or -not $process.WaitForExit(7000)) {
            throw "Zamknij okno Silvy, aby można było zaktualizować aplikację."
        }
    }

    New-Item -ItemType Directory -Path $appDirectory -Force | Out-Null
    $staged = Join-Path $appDirectory ("Silva-" + [Guid]::NewGuid().ToString("N") + ".tmp")
    Copy-Item -LiteralPath $build -Destination $staged
    if ((Get-FileHash -LiteralPath $staged).Hash -ne $buildHash) {
        throw "Kopia pliku aplikacji różni się od kompilacji."
    }
    [IO.File]::Move($staged, $destination, $true)

    if ($DesktopShortcut) {
        $desktop = [Environment]::GetFolderPath("DesktopDirectory")
        $shortcutPath = Join-Path $desktop "Silva.lnk"
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $destination
        $shortcut.WorkingDirectory = $appDirectory
        $shortcut.IconLocation = "$destination,0"
        $shortcut.Description = "Silva - osobiste centrum dowodzenia"
        $shortcut.Save()
        Write-Host "Skrót  $shortcutPath"
    }

    Write-Host "Silva  $destination"
    Write-Host "SHA-256  $buildHash"
}
finally {
    Pop-Location
    $env:CARGO_TARGET_DIR = $previousTarget
}
