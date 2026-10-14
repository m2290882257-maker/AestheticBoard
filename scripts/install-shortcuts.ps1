[CmdletBinding()]
param([switch]$ProjectOnly)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$electronPath = Join-Path $projectRoot 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path -LiteralPath $electronPath -PathType Leaf)) {
    throw 'Electron is missing. Run npm.cmd ci in the project directory, then retry.'
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'package.json') -PathType Leaf)) {
    throw 'The project package.json is missing.'
}
$shortcutDirectories = @($projectRoot)
if (-not $ProjectOnly) {
    $shortcutDirectories += [Environment]::GetFolderPath('DesktopDirectory')
    $shortcutDirectories += [Environment]::GetFolderPath('Programs')
}
$shell = New-Object -ComObject WScript.Shell
foreach ($directory in ($shortcutDirectories | Select-Object -Unique)) {
    if ([string]::IsNullOrWhiteSpace($directory)) { throw 'Windows shortcut folder is unavailable.' }
    [void][IO.Directory]::CreateDirectory($directory)
    $shortcutPath = Join-Path $directory 'AestheticBoard.lnk'
    if (Test-Path -LiteralPath $shortcutPath) {
        $existing = $shell.CreateShortcut($shortcutPath)
        if ($existing.TargetPath -ne $electronPath -or $existing.Arguments -ne ('"' + $projectRoot + '"')) {
            throw "A different shortcut already exists at $shortcutPath. Rename it before retrying."
        }
    }
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $electronPath
    $shortcut.Arguments = '"' + $projectRoot + '"'
    $shortcut.WorkingDirectory = $projectRoot
    $shortcut.Description = 'Open AestheticBoard'
    $shortcut.IconLocation = "$electronPath,0"
    $shortcut.WindowStyle = 1
    $shortcut.Save()
    Write-Output "Created: $shortcutPath"
}
