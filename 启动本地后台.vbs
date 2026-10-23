Option Explicit
Dim shell, files, root, entry, node, candidate, folder, code
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)
entry = files.BuildPath(root, "tools\local-admin\launch.cjs")
node = ""

For Each candidate In Array( _
  shell.ExpandEnvironmentStrings("%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"), _
  shell.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe"), _
  shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\nodejs\node.exe"))
  If files.FileExists(candidate) Then
    node = candidate
    Exit For
  End If
Next
If node = "" Then
  For Each folder In Split(shell.Environment("Process")("PATH"), ";")
    folder = Replace(Trim(folder), Chr(34), "")
    If Len(folder) > 0 Then
      candidate = files.BuildPath(folder, "node.exe")
      If files.FileExists(candidate) Then
        node = candidate
        Exit For
      End If
    End If
  Next
End If
If node = "" Then
  MsgBox "Node.js was not found. Please install Node.js 20.19 or newer.", 16, "ManaFeng"
  WScript.Quit 1
End If

shell.CurrentDirectory = root
On Error Resume Next
code = shell.Run(Chr(34) & node & Chr(34) & " " & Chr(34) & entry & Chr(34), 0, True)
If Err.Number <> 0 Then code = 1
On Error GoTo 0
If code <> 0 Then
  MsgBox "Could not start the local admin. Details: " & files.BuildPath(root, ".local-admin\startup.log"), 16, "ManaFeng"
End If
WScript.Quit code
