# Git Aliases

This folder vendors the user's current Git shortcut files from the local PowerShell setup.

Source on the current machine:

- `C:\Users\lyubo\alias\git-aliases.ps1`
- `C:\Users\lyubo\alias\.git.alias`

Included here so the shortcut set travels with the repo and can be reused on another machine.

## Files

- `git-aliases.ps1`: PowerShell function aliases loaded by the PowerShell profile
- `.git.alias`: shell alias/function definitions for POSIX-style shells

## Current PowerShell profile snippet

```powershell
$gitAliasProfile = 'C:\Users\lyubo\alias\git-aliases.ps1'

if (Test-Path $gitAliasProfile) {
    . $gitAliasProfile
}
```

## Notes

- The PowerShell alias file is the live source used by this machine today.
- The shell alias file is useful for WSL/Linux/macOS environments.
- The repo copy is a portable snapshot, not an automatic sync target.