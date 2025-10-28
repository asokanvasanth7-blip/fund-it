<#
clean-cache.ps1

Usage examples:
  # Dry run to see actions
  .\clean-cache.ps1 -WhatIf

  # Remove node_modules, clean npm cache and remove package-lock.json, then run npm ci
  .\clean-cache.ps1 -RemoveLockFile -DoInstall

  # Only remove node_modules and verify npm cache
  .\clean-cache.ps1

Parameters:
  -RemoveLockFile  : Also delete package-lock.json
  -DoInstall       : Run `npm ci` after cleaning
  -SkipNodeModules : Don't delete node_modules
  -Retries         : Number of retries for deletions (default 5)
#>

param(
    [switch]$RemoveLockFile,
    [switch]$DoInstall,
    [switch]$SkipNodeModules,
    [int]$Retries = 5
)

function Write-Info($msg){ Write-Host "[info] $msg" -ForegroundColor Cyan }
function Write-Warn($msg){ Write-Host "[warn] $msg" -ForegroundColor Yellow }
function Write-Err($msg){ Write-Host "[error] $msg" -ForegroundColor Red }

$cwd = Get-Location
Write-Info "Working directory: $cwd"

# Stop node/npm processes to reduce chance of locked files
try{
    $procs = Get-Process -Name node,npm,npx -ErrorAction SilentlyContinue
    if($procs){
        foreach($p in $procs){
            Write-Info "Stopping process $($p.ProcessName) (Id $($p.Id))"
            try{ Stop-Process -Id $p.Id -Force -ErrorAction Stop } catch { Write-Warn "Failed to stop process $($p.Id): $($_.Exception.Message)" }
        }
    } else {
        Write-Info "No node/npm processes found"
    }
} catch {
    Write-Warn "Could not enumerate/stop node processes: $($_.Exception.Message)"
}

function Remove-Path-WithRetries([string]$path, [int]$retries){
    if(-not (Test-Path $path)){
        Write-Info "Path not found: $path"
        return $true
    }

    for($i=1; $i -le $retries; $i++){
        try{
            Write-Info "Attempt $i: Removing $path"
            Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction Stop
            Write-Info "Removed $path"
            return $true
        } catch {
            Write-Warn "Attempt $i failed: $($_.Exception.Message)"
            Start-Sleep -Seconds 1

            # Windows-specific remediation: try rename problematic native files, take ownership, adjust ACLs
            if($IsWindows){
                try{
                    # Try to find executables / napi binaries and rename them
                    $files = Get-ChildItem -Path $path -Include *.exe,*.dll,*.node -Recurse -ErrorAction SilentlyContinue | Where-Object { -not $_.PSIsContainer }
                    foreach($f in $files){
                        $bak = "$($f.FullName).bak"
                        if(-not (Test-Path $bak)){
                            try{ Rename-Item -LiteralPath $f.FullName -NewName ($f.Name + '.bak') -ErrorAction SilentlyContinue } catch { }
                        }
                    }
                    # take ownership and grant full control (best-effort)
                    Write-Info "Attempting takeown/icacls on $path"
                    cmd /c "takeown /f `"$path`" /r /d y" | Out-Null
                    cmd /c "icacls `"$path`" /grant *S-1-1-0:F /t /c" | Out-Null
                } catch {
                    Write-Warn "Windows remediation steps failed: $($_.Exception.Message)"
                }
            }
        }
    }
    Write-Err "Failed to remove $path after $retries attempts"
    return $false
}

# Remove node_modules unless skipped
if(-not $SkipNodeModules){
    $nm = Join-Path $cwd 'node_modules'
    if(Test-Path $nm){
        $ok = Remove-Path-WithRetries -path $nm -retries $Retries
        if(-not $ok){
            Write-Err "Could not remove node_modules. Try closing editors, disabling antivirus, or rebooting, then re-run this script as Administrator."
            exit 1
        }
    } else {
        Write-Info "node_modules not present"
    }
} else {
    Write-Info "Skipping node_modules removal (SkipNodeModules set)"
}

# Remove dist / build artifacts
$distPaths = @('dist','www','build','out','android/build','android/app/build')
foreach($p in $distPaths){
    $full = Join-Path $cwd $p
    if(Test-Path $full){
        Remove-Path-WithRetries -path $full -retries 3 | Out-Null
    }
}

# Optionally remove package-lock.json
if($RemoveLockFile){
    $lock = Join-Path $cwd 'package-lock.json'
    if(Test-Path $lock){
        try{ Remove-Item -LiteralPath $lock -Force -ErrorAction Stop; Write-Info "Removed package-lock.json" } catch { Write-Warn "Failed to remove package-lock.json: $($_.Exception.Message)" }
    } else { Write-Info "No package-lock.json found to remove" }
}

# Clean npm cache (danger: --force required to actually delete)
try{
    Write-Info "Running: npm cache clean --force"
    npm cache clean --force | Write-Host
    Write-Info "Running: npm cache verify"
    npm cache verify | Write-Host
} catch {
    Write-Warn "npm cache commands failed: $($_.Exception.Message)"
}

# Optionally run install (npm ci)
if($DoInstall){
    try{
        Write-Info "Running npm ci"
        npm ci 2>&1 | Write-Host
    } catch {
        Write-Warn "npm ci failed: $($_.Exception.Message)"
    }
} else {
    Write-Info "Skipping install. Re-run with -DoInstall to run npm ci after cleaning."
}

Write-Info "Clean complete"

