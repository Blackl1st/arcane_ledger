' Arcane Ledger - Silent Desktop App Launcher
' Launches the Arcane Ledger dedicated desktop window without a black console window.

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

objShell.CurrentDirectory = strPath
objShell.Run "python desktop_launcher.py", 0, False
