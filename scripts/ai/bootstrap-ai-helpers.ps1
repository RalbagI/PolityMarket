# AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; script = bootstrap-ai-helpers
$ErrorActionPreference = "Stop"

$ProjectRoot = (& git rev-parse --show-toplevel 2>$null)
if (-not $ProjectRoot) {
    $ProjectRoot = (Get-Location).Path
} else {
    $ProjectRoot = $ProjectRoot.Trim()
}

$Repo = if ($env:AI_HELPERS_REPO) { $env:AI_HELPERS_REPO } else { 'https://gitlab.com/TalkPoint/AI_Helpers.git' }
$Ref = if ($env:AI_HELPERS_REF) { $env:AI_HELPERS_REF } else { 'main' }

function Get-AihCacheRoot {
    if ($env:AI_HELPERS_CACHE) { return $env:AI_HELPERS_CACHE }
    $platform = [System.Environment]::OSVersion.Platform.ToString()
    if ($platform -like "Win*") {
        $base = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { Join-Path $HOME "AppData\Local" }
        return (Join-Path $base "TalkPoint\AI_Helpers")
    }
    if ($platform -eq "MacOSX") {
        return (Join-Path $HOME "Library/Caches/TalkPoint/AI_Helpers")
    }
    $base = if ($env:XDG_CACHE_HOME) { $env:XDG_CACHE_HOME } else { Join-Path $HOME ".cache" }
    return (Join-Path $base "talkpoint/AI_Helpers")
}

function Find-AihCentral {
    $candidates = @()
    if ($env:AI_HELPERS_HOME) { $candidates += $env:AI_HELPERS_HOME }
    $candidates += $ProjectRoot
    $candidates += (Join-Path (Split-Path -Parent $ProjectRoot) "AI_Helpers")
    $candidates += (Get-AihCacheRoot)
    foreach ($candidate in $candidates) {
        if (Test-AihCentral $candidate) {
            return (Resolve-Path $candidate).Path
        }
    }
    return $null
}

function Test-AihCentral($Candidate) {
    if (-not $Candidate) { return $false }
    $Manifest = Join-Path $Candidate ".agent/ai-helpers.yml"
    $HasProjectId = (Test-Path $Manifest) -and
        (Select-String -Path $Manifest -Pattern "^\s*id:\s*['`"]?ai_helpers['`"]?(\s*(#.*)?)?$" -Quiet)
    return (
        (Test-Path (Join-Path $Candidate "bin/aih.ps1")) -and
        (Test-Path (Join-Path $Candidate "tools/aih.py")) -and
        (Test-Path (Join-Path $Candidate "VERSION")) -and
        (Test-Path (Join-Path $Candidate "content/workflows/universal")) -and
        $HasProjectId
    )
}

function Get-AihBootstrapTarget {
    if ($env:AI_HELPERS_HOME) { return $env:AI_HELPERS_HOME }
    if ($env:AI_HELPERS_CACHE) { return (Get-AihCacheRoot) }
    return (Join-Path (Split-Path -Parent $ProjectRoot) "AI_Helpers")
}

function Get-AihGitRepo {
    if ($env:CI_JOB_TOKEN -and $Repo.StartsWith("https://gitlab.com/")) {
        return "https://gitlab-ci-token:$($env:CI_JOB_TOKEN)@" + $Repo.Substring("https://".Length)
    }
    return $Repo
}

function Test-AihSkipPathSetup {
    return ($env:AI_HELPERS_SKIP_PATH_SETUP -match "^(1|true|TRUE|yes|YES)$")
}

function Test-AihInstallPath {
    return ($env:AI_HELPERS_INSTALL_PATH -match "^(1|true|TRUE|yes|YES)$")
}

function Split-AihPath($Value, $Separator) {
    return @($Value -split [regex]::Escape([string]$Separator) | Where-Object { $_ })
}

function Add-AihToPath {
    if (Test-AihSkipPathSetup) {
        return
    }
    if (Get-Command aih -ErrorAction SilentlyContinue) {
        return
    }
    $Bin = Join-Path $Central "bin"
    $Separator = [System.IO.Path]::PathSeparator
    $CurrentParts = Split-AihPath $env:Path $Separator |
        Where-Object { $_ -ne $Bin }
    $env:Path = [string]::Join($Separator, @($Bin) + @($CurrentParts))
    if (-not (Test-AihInstallPath)) {
        Write-Warning "bootstrap-ai-helpers.ps1: added $Bin to PATH for this process; set AI_HELPERS_INSTALL_PATH=1 to persist it."
        return
    }
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $UserParts = Split-AihPath $UserPath $Separator |
        Where-Object { $_ -ne $Bin }
    $NewUserPath = [string]::Join($Separator, @($Bin) + @($UserParts))
    if ($NewUserPath -ne $UserPath) {
        [Environment]::SetEnvironmentVariable("Path", $NewUserPath, "User")
        Write-Warning "bootstrap-ai-helpers.ps1: added $Bin to user PATH; open a new shell to use 'aih' directly."
    }
}

function Assert-AihCleanCentral {
    $Status = (& git -C $Central status --porcelain)
    if ($Status) {
        Write-Error "bootstrap-ai-helpers.ps1: $Central has local changes; clean it or set AI_HELPERS_HOME to another checkout"
        & git -C $Central status --short
        exit 1
    }
}

function Test-AihCiRuntime {
    return (
        ($env:CI -match "^(1|true|TRUE|yes|YES)$") -or
        ($env:GITHUB_ACTIONS -match "^(1|true|TRUE|yes|YES)$") -or
        ($env:GITLAB_CI -match "^(1|true|TRUE|yes|YES)$")
    )
}

# Existing valid central checkouts are operator-managed. Bootstrap clones or
# repairs missing central locations. CI refreshes a clean sibling checkout to
# the declared ref before sync so persistent runners cannot use stale helpers.
$Central = Find-AihCentral
if ($Central -and (Test-AihCiRuntime)) {
    $CentralGitRoot = (& git -C $Central rev-parse --show-toplevel 2>$null)
    $ProjectGitRoot = (& git -C $ProjectRoot rev-parse --show-toplevel 2>$null)
    if ($CentralGitRoot -and $ProjectGitRoot -and
        ((Resolve-Path $CentralGitRoot.Trim()).Path -ne (Resolve-Path $ProjectGitRoot.Trim()).Path)) {
        $GitRepo = Get-AihGitRepo
        Assert-AihCleanCentral
        & git -C $Central fetch --prune $GitRepo $Ref
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        & git -C $Central checkout $Ref
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        & git -C $Central pull --ff-only $GitRepo $Ref
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}
if (-not $Central) {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "bootstrap-ai-helpers.ps1: git is required to clone AI_Helpers"
    }
    $Central = Get-AihBootstrapTarget
    $gitDir = Join-Path $Central ".git"
    if ((Test-Path $Central) -and -not (Test-Path $gitDir)) {
        throw "bootstrap-ai-helpers.ps1: $Central exists but is not an AI_Helpers git checkout"
    }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Central) | Out-Null
    $GitRepo = Get-AihGitRepo
    if (Test-Path $gitDir) {
        Assert-AihCleanCentral
        & git -C $Central fetch --prune $GitRepo $Ref
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        & git -C $Central checkout $Ref
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        & git -C $Central pull --ff-only $GitRepo $Ref
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    } else {
        & git clone $GitRepo $Central
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        & git -C $Central remote set-url origin $Repo
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        & git -C $Central checkout $Ref
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }
}

$Aih = Join-Path $Central "bin/aih.ps1"
if (-not (Test-Path $Aih)) {
    throw "bootstrap-ai-helpers.ps1: missing executable $Aih"
}
Add-AihToPath

& $Aih sync --project-root $ProjectRoot
$Status = $LASTEXITCODE
if ($Status -eq 0) {
    & $Aih doctor --project-root $ProjectRoot
    $Status = $LASTEXITCODE
}
if ($Status -eq 0) { exit 0 }

$gitDir = Join-Path $Central ".git"
if (Test-Path $gitDir) {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        exit $Status
    }
    Write-Warning "bootstrap-ai-helpers.ps1: refreshing AI_Helpers checkout after failed validation"
    $GitRepo = Get-AihGitRepo
    Assert-AihCleanCentral
    & git -C $Central fetch --prune $GitRepo $Ref
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & git -C $Central checkout $Ref
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & git -C $Central pull --ff-only $GitRepo $Ref
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    $Aih = Join-Path $Central "bin/aih.ps1"
    if (-not (Test-Path $Aih)) {
        throw "bootstrap-ai-helpers.ps1: missing executable $Aih"
    }
    Add-AihToPath
    & $Aih sync --project-root $ProjectRoot
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $Aih doctor --project-root $ProjectRoot
    exit $LASTEXITCODE
}

exit $Status
