$WshShell = New-Object -ComObject WScript.Shell
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path -Path $desktopPath -ChildPath "JARVIS.lnk"

$electronExe = "C:\Users\ADMIN\Documents\Jarvis\node_modules\electron\dist\electron.exe"
$workingDir = "C:\Users\ADMIN\Documents\Jarvis"
$iconPath = "C:\Users\ADMIN\Documents\Jarvis\electron\icon.png"

$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $electronExe
$shortcut.Arguments = "`"$workingDir`""
$shortcut.WorkingDirectory = $workingDir
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = "JARVIS - Assistant Personnel de Roysten"
$shortcut.Save()

Write-Host "Raccourci Bureau JARVIS.lnk mis à jour avec le binaire natif : $shortcutPath"
