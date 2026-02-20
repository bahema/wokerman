$ErrorActionPreference = "Stop"

$forbiddenPaths = @(
  '^storage/(?!\.gitkeep$).+',
  '^backend/storage/(?!\.gitkeep$).+'
)

$secretPatterns = @(
  'BEGIN [A-Z ]*PRIVATE KEY',
  '(?im)^\s*AUTH_COOKIE_SIGNING_KEY\s*=\s*.+$',
  '(?im)^\s*AUTH_COOKIE_SECRET\s*=\s*.+$',
  '(?im)^\s*SESSION_SECRET\s*=\s*.+$',
  '(?im)^\s*SMTP_PASS\s*=\s*.+$',
  '(?im)^\s*OWNER_BOOTSTRAP_KEY\s*=\s*.+$',
  '\bAKIA[0-9A-Z]{16}\b',
  '\bghp_[A-Za-z0-9]{20,}\b',
  '\bsk_(live|test)_[A-Za-z0-9]{16,}\b'
)

$stagedFilesRaw = git diff --cached --name-only --diff-filter=ACMR
$stagedFiles = @($stagedFilesRaw | Where-Object { $_ -and $_.Trim() })
$violations = New-Object System.Collections.Generic.List[string]

foreach ($file in $stagedFiles) {
  $normalized = $file.Replace('\', '/')
  $isForbiddenPath = $false

  foreach ($pathPattern in $forbiddenPaths) {
    if ($normalized -match $pathPattern) {
      $violations.Add("Forbidden runtime storage path staged: $normalized")
      $isForbiddenPath = $true
      break
    }
  }

  if ($isForbiddenPath) {
    continue
  }

  $content = ""
  try {
    $content = git show ":$normalized" 2>$null
  } catch {
    $content = ""
  }

  if (-not $content) {
    continue
  }

  foreach ($pattern in $secretPatterns) {
    if ($content -match $pattern) {
      $violations.Add("Possible secret in staged file: $normalized (pattern: $pattern)")
      break
    }
  }
}

if ($violations.Count -gt 0) {
  Write-Host "Secret scan failed." -ForegroundColor Red
  foreach ($violation in $violations) {
    Write-Host "- $violation" -ForegroundColor Red
  }
  exit 1
}

Write-Host "Secret scan passed." -ForegroundColor Green
