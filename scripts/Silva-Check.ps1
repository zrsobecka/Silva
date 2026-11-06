[CmdletBinding()]
param()

. "$PSScriptRoot\Silva-BuildCommon.ps1"
$previousTarget = $env:CARGO_TARGET_DIR
Push-Location $ProjectRoot
try {
    Initialize-SilvaBuild
    Invoke-SilvaStep npm.cmd @("run", "format:check")
    Invoke-SilvaStep npm.cmd @("run", "lint")
    Invoke-SilvaStep npm.cmd @("test")
    Invoke-SilvaStep npm.cmd @("run", "build")
    Invoke-SilvaStep cargo @("fmt", "--manifest-path", $CargoManifest, "--", "--check")
    Invoke-SilvaStep cargo @("check", "--locked", "--manifest-path", $CargoManifest)
    Invoke-SilvaStep cargo @("test", "--locked", "--manifest-path", $CargoManifest)
}
finally {
    Pop-Location
    $env:CARGO_TARGET_DIR = $previousTarget
}
