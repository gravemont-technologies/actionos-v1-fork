# Error tracking helper script for PowerShell
# Usage: .\scripts\track-error.ps1 "Error description" "Component" "Severity"

param(
    [Parameter(Mandatory=$true)]
    [string]$ErrorDesc,
    
    [Parameter(Mandatory=$true)]
    [string]$Component,
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Critical", "High", "Medium", "Low")]
    [string]$Severity = "Medium"
)

$Date = Get-Date -Format "yyyy-MM-dd"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$BugFile = "docs\bugs-and-errors.md"

# Check if error already exists
$Content = Get-Content $BugFile -Raw
if ($Content -match [regex]::Escape($ErrorDesc)) {
    Write-Host "⚠️  Error already documented. Marking as repeated..." -ForegroundColor Yellow
    Write-Host "Please manually mark this error as repeated in $BugFile" -ForegroundColor Yellow
} else {
    Write-Host "📝 Adding new error to tracking log..." -ForegroundColor Green
    
    # Count existing errors
    $ErrorCount = ([regex]::Matches($Content, "### Error #")).Count + 1
    
    # Create error entry
    $Entry = @"

### Error #$ErrorCount: $ErrorDesc
**Date:** $Date  
**Status:** 🔴 Active  
**Severity:** $Severity  
**Component:** $Component

**Error Pattern:**
``````
[Paste error message here]
``````

**Context:**
- Time: $Timestamp
- Command: $(Get-History -Count 1 | Select-Object -ExpandProperty CommandLine)

**Investigation:**
- [ ] Error reproduced
- [ ] Root cause identified
- [ ] Solution implemented
- [ ] Testing completed

**Solution:**
[To be filled]

**Testing Strategy:**
[To be filled]

---

"@
    
    Add-Content -Path $BugFile -Value $Entry
    Write-Host "✅ Error logged to $BugFile" -ForegroundColor Green
    Write-Host "📋 Please fill in the error pattern, solution, and testing strategy" -ForegroundColor Cyan
}

