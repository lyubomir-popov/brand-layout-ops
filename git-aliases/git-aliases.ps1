# Git command aliases for PowerShell.

function global:New-GitAliasFunction {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,

        [Parameter(Mandatory = $true)]
        [string[]]$Command
    )

    $commandHead = $Command[0]
    $commandTail = @()

    if ($Command.Length -gt 1) {
        $commandTail = $Command[1..($Command.Length - 1)]
    }

    $body = {
        param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
        & $commandHead @commandTail @Arguments
    }.GetNewClosure()

    Set-Item -Path ("Function:\global:" + $Name) -Value $body
}

$gitAliasMap = [ordered]@{
    'a' = @('git', 'add')
    'a.' = @('git', 'add', '.')
    'aa.' = @('git', 'add', '-A', '.')
    'ap' = @('git', 'add', '-p')
    'ap.' = @('git', 'add', '-p', '.')
    'ay' = @('git', 'apply')
    'b' = @('git', 'branch')
    'bD' = @('git', 'branch', '-D')
    'bmv' = @('git', 'branch', '--move')
    'bu' = @('git', 'branch', '-u')
    'bv' = @('git', 'branch', '-avv')
    'bi' = @('git', 'bisect')
    'bib' = @('git', 'bisect', 'bad')
    'big' = @('git', 'bisect', 'good')
    'bir' = @('git', 'bisect', 'reset')
    'bis' = @('git', 'bisect', 'start')
    'bl' = @('git', 'blame')
    'ct' = @('git', 'commit')
    'cam' = @('git', 'commit', '-a', '-m')
    'cb' = @('git', 'checkout', '-b')
    'cfg' = @('git', 'config', '--global')
    'cfgl' = @('git', 'config', '--global', '-l')
    'cm' = @('git', 'commit', '-m')
    'cme' = @('git', 'commit', '--edit', '-m')
    'co' = @('git', 'checkout')
    'coh' = @('git', 'checkout', 'HEAD')
    'coh.' = @('git', 'checkout', 'HEAD~')
    'coh..' = @('git', 'checkout', 'HEAD~~')
    'coh...' = @('git', 'checkout', 'HEAD~~~')
    'cot' = @('git', 'checkout', '--track')
    'ck' = @('git', 'cherry-pick')
    'ckA' = @('git', 'cherry-pick', '--abort')
    'ckc' = @('git', 'cherry-pick', '--continue')
    'fe' = @('git', 'fetch')
    'fa' = @('git', 'fetch', '--all')
    'fu' = @('git', 'fetch', 'upstream')
    'f' = @('git', 'diff', '--minimal')
    'ff' = @('git', 'diff', '--minimal', '--staged')
    'fx' = @('git', 'diff', '--minimal', '--stat')
    'ffx' = @('git', 'diff', '--minimal', '--staged', '--stat')
    'fz' = @('git', 'diff', '--minimal', '--shortstat')
    'ffz' = @('git', 'diff', '--minimal', '--staged', '--shortstat')
    'fsck' = @('git', 'fsck')
    'gg' = @('git', 'grep')
    'ggi' = @('git', 'grep', '-i')
    'gt' = @('git', 'tag')
    'g,t' = @('git', 'ls-tree')
    'g,th' = @('git', 'ls-tree', 'HEAD')
    'g0' = @('git', 'rev-list', '--max-parents=0', 'HEAD')
    'gk' = @('git', 'clone', '--recursive')
    'gkm' = @('git', 'clone', '--mirror')
    'gkn' = @('git', 'clone', '--no-checkout')
    'gkbb' = @('git', 'clone', '--bare', '--single-branch', '--depth', '1', '-b')
    'gw' = @('git', 'worktree')
    'gwa' = @('git', 'worktree', 'add')
    'gwab' = @('git', 'worktree', 'add', '-b')
    'gwlk' = @('git', 'worktree', 'lock')
    'gwls' = @('git', 'worktree', 'list')
    'gwMv' = @('git', 'worktree', 'move')
    'gwRm' = @('git', 'worktree', 'remove')
    'gwuk' = @('git', 'worktree', 'unlock')
    'gn' = @('git', 'init')
    'gnb' = @('git', 'init', '--bare')
    'lg' = @('git', 'log', '--color', '--date=iso')
    'i' = @('git', 'log', '--color', '--date=iso', '--oneline', '-30')
    'ix' = @('git', 'log', '--color', '--date=iso', '--all', '--oneline', '-30')
    'ii' = @('git', 'log', '--color', '--date=iso', '--oneline')
    'iix' = @('git', 'log', '--color', '--date=iso', '--all', '--oneline')
    'j' = @('git', 'log', '--color', '--date=iso', '--all', '--oneline', '--decorate', '--graph', '-30')
    'jg' = @('git', 'log', '--color', '--date=iso', '--all', '--oneline', '--decorate', '--grep')
    'jx' = @('git', 'log', '--color', '--date=iso', '--oneline', '--decorate', '--graph', '-30')
    'jj' = @('git', 'log', '--color', '--date=iso', '--all', '--oneline', '--decorate', '--graph')
    'jjx' = @('git', 'log', '--color', '--date=iso', '--oneline', '--decorate', '--graph')
    'jk' = @('git', 'log', '--color', '--date=iso', '--all', '--graph', "--pretty='%C(bold yellow)%h%C(bold red)%d %C(bold white)%<(139,trunc)%s%n        %C(bold magenta)%cd %C(green)%an'")
    'jkx' = @('git', 'log', '--color', '--date=iso', '--graph', "--pretty='%C(bold yellow)%h%C(bold red)%d %C(bold white)%<(139,trunc)%s%n        %C(bold magenta)%cd %C(green)%an'")
    'mg' = @('git', 'merge')
    'mgA' = @('git', 'merge', '--abort')
    'mq' = @('git', 'merge', '--squash', '--commit', '--edit')
    'md' = @('git', 'commit', '--amend', '--no-edit')
    'mdm' = @('git', 'commit', '--amend', '-m')
    'pul' = @('git', 'pull')
    'Pp' = @('git', 'push')
    'PpF' = @('git', 'push', '--force')
    'Po' = @('git', 'push', 'origin')
    'Pso' = @('git', 'push', '--set-upstream', 'origin')
    'PoF' = @('git', 'push', 'origin', '--force')
    'PoA' = @('git', 'push', 'origin', '--all')
    'Pu' = @('git', 'push', 'upstream')
    'Psu' = @('git', 'push', '--set-upstream', 'upstream')
    'PuF' = @('git', 'push', 'upstream', '--force')
    'PuA' = @('git', 'push', 'upstream', '--all')
    'Ps' = @('git', 'push', '--set-upstream')
    'r' = @('git', 'remote')
    'ra' = @('git', 'remote', 'add')
    'rao' = @('git', 'remote', 'add', 'origin')
    'rau' = @('git', 'remote', 'add', 'upstream')
    'ren' = @('git', 'remote', 'rename')
    'rv' = @('git', 'remote', '-v')
    'rb' = @('git', 'rebase')
    'rbA' = @('git', 'rebase', '--abort')
    'rbc' = @('git', 'rebase', '--continue')
    'rbi' = @('git', 'rebase', '--interactive')
    'rbk' = @('git', 'rebase', '--skip')
    'rbo' = @('git', 'rebase', '--onto')
    'ref' = @('git', 'reflog')
    'rsH' = @('git', 'reset', '--hard')
    'rs' = @('git', 'reset')
    'rss' = @('git', 'reset', '--soft')
    's' = @('git', 'status')
    'sx' = @('git', 'status', '--short', '--branch')
    'sls' = @('git', 'stash', 'list')
    'sv' = @('git', 'stash', 'save')
    'sva' = @('git', 'stash', 'save', '--all')
    'svk' = @('git', 'stash', 'save', '--keep-index')
    'svka' = @('git', 'stash', 'save', '--keep-index', '--all')
    'svu' = @('git', 'stash', 'save', '--include-untracked')
    'svku' = @('git', 'stash', 'save', '--keep-index', '--include-untracked')
    'sw' = @('git', 'stash', 'show')
    'sy' = @('git', 'stash', 'apply')
    'un' = @('git', 'update-index', '--assume-unchanged')
    'nun' = @('git', 'update-index', '--no-assume-unchanged')
    'w' = @('git', 'show', '--stat')
    'ww' = @('git', 'show')
    'wx' = @('git', 'show', '--shortstat')
}

foreach ($entry in $gitAliasMap.GetEnumerator()) {
    New-GitAliasFunction -Name $entry.Key -Command $entry.Value
}

Set-Item -Path 'Function:gh' -Value {
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
    & git grep @Arguments HEAD
}

Set-Item -Path 'Function:gh.' -Value {
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
    & git grep @Arguments 'HEAD~'
}

Set-Item -Path 'Function:gh..' -Value {
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
    & git grep @Arguments 'HEAD~~'
}

Set-Item -Path 'Function:gh...' -Value {
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
    & git grep @Arguments 'HEAD~~~'
}

Set-Item -Path 'Function:ghi' -Value {
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
    & git grep -i @Arguments HEAD
}

Set-Item -Path 'Function:ghi.' -Value {
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
    & git grep -i @Arguments 'HEAD~'
}

Set-Item -Path 'Function:ghi..' -Value {
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
    & git grep -i @Arguments 'HEAD~~'
}

Set-Item -Path 'Function:ghi...' -Value {
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
    & git grep -i @Arguments 'HEAD~~~'
}

Set-Item -Path 'Function:mdd' -Value {
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
    $date = Get-Date -Format 'r'
    & git commit --amend --no-edit --date="$date" @Arguments
}

Set-Item -Path 'Function:tk' -Value {
    Start-Process gitk | Out-Null
}

Set-Item -Path 'Function:tka' -Value {
    Start-Process gitk -ArgumentList '--all' | Out-Null
}

Set-Item -Path 'Function:wun' -Value {
    git ls-files -v | Select-String '^h'
}

Set-Item -Path 'Function:w0' -Value {
    param([Parameter(ValueFromRemainingArguments = $true)][object[]]$Arguments)
    $rootCommit = (& git rev-list --max-parents=0 HEAD | Select-Object -First 1)
    & git show --stat "$rootCommit..HEAD" @Arguments
}