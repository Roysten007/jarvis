$WshShell = New-Object -ComObject WScript.Shell
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path -Path $desktopPath -ChildPath "JARVIS.lnk"

$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "node.exe"
$shortcut.Arguments = ".\node_modules\electron\cli.js ."
$shortcut.WorkingDirectory = "C:\Users\ADMIN\Documents\Jarvis"
$shortcut.IconLocation = "C:\Users\ADMIN\Documents\Jarvis\electron\icon.png,0"
$shortcut.Description = "JARVIS - Assistant Personnel de Roysten"
$shortcut.Save()

Write-Host "Raccourci Bureau créé avec succès : $shortcutPath"
