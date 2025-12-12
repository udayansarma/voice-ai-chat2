<#!
Unified Native App Service Deployment Script (Step 2: Server Only)

This script currently implements server deployment; client deployment logic is scaffolded for future steps.
Usage Example (Server Only):
  pwsh ./deploy-appservice.ps1 -SubscriptionId <sub> -ResourceGroupName <rg> -ServerAppName voice-ai-server-native -SkipClient

Parameters:
  -SubscriptionId (required)
  -ResourceGroupName (required)
  -ServerAppName (required unless -SkipServer)
  -ClientAppName (optional for future client deploy path)
  -Location (default eastus) – used only if creating missing resources
  -ApiBaseUrl (optional) – overrides computed https://<server>.azurewebsites.net (no trailing /api)
  -NodeVersion (default 20-lts)
  -SkipServer / -SkipClient switches
  -NoBuild (reuse previous build artifacts)
  -WhatIf (dry-run, prints actions only)

Idempotent: safe to re-run; updates App Settings and redeploys.
#>

param(
  [Parameter(Mandatory=$true)] [string]$SubscriptionId,
  [Parameter(Mandatory=$true)] [string]$ResourceGroupName,
  [Parameter(Mandatory=$false)] [string]$ServerAppName,
  [Parameter(Mandatory=$false)] [string]$ClientAppName,
  [Parameter(Mandatory=$false)] [string]$Location = 'eastus',
  [Parameter(Mandatory=$false)] [string]$ApiBaseUrl,
  [Parameter(Mandatory=$false)] [string]$AzureSpeechKey,
  [Parameter(Mandatory=$false)] [string]$AzureSpeechRegion,
  [Parameter(Mandatory=$false)] [string]$ApplicationInsightsConnectionString,
  [Parameter(Mandatory=$false)] [string]$NodeVersion = '20-lts',
  [switch]$SkipServer,
  [switch]$SkipClient,
  [switch]$PureStaticClient,
  [switch]$NoBuild,
  [switch]$EnableLogs,
  [switch]$EnableApplicationInsights,
  [switch]$PostDeployInspect,
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Gray }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERROR] $msg" -ForegroundColor Red }

if ($SkipServer -and $SkipClient) { Write-Err 'Both -SkipServer and -SkipClient specified. Nothing to do.'; exit 1 }
if (-not $SkipServer -and -not $ServerAppName) { Write-Err 'ServerAppName is required unless -SkipServer.'; exit 1 }

# Root paths
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Join-Path $RepoRoot 'server'
$ClientDir = Join-Path $RepoRoot 'client'
$ArtifactsRoot = Join-Path $RepoRoot 'deploy_artifacts'
$ServerPkgDir = Join-Path $ArtifactsRoot 'server_package'
$ClientPkgDir = Join-Path $ArtifactsRoot 'client_package'
New-Item -ItemType Directory -Force -Path $ArtifactsRoot | Out-Null

function Ensure-AzCli {
  if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Err 'Azure CLI not found in PATH.'
    exit 1
  }
}

function Ensure-Login {
  $acct = az account show --query id -o tsv 2>$null
  if (-not $acct) {
    Write-Info 'Logging into Azure...'
    az login | Out-Null
  }
  az account set --subscription $SubscriptionId | Out-Null
}

function Remove-Directory-Robust {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (-not (Test-Path $Path)) { return }
  Write-Info "Removing directory (robust): $Path"
  try {
    Get-ChildItem -Path $Path -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
      if ($_.Attributes -band [IO.FileAttributes]::ReadOnly) { try { $_.Attributes = 'Normal' } catch {} }
    }
    Remove-Item -Recurse -Force -LiteralPath $Path -ErrorAction Stop
  } catch {
    Write-Warn "Primary Remove-Item failed: $($_.Exception.Message) — attempting rimraf fallback"
    try { npx --yes rimraf $Path 2>$null } catch {
      Write-Warn "rimraf fallback failed: $($_.Exception.Message) — attempting cmd.exe rmdir"
      try { cmd /c "rmdir /s /q `"$Path`"" | Out-Null } catch {
        Write-Err "All removal attempts failed for $Path."; throw
      }
    }
  }
}

function Remove-Directory-WithRetry {
  param([Parameter(Mandatory=$true)][string]$Path,[int]$Attempts=3,[int]$DelaySeconds=2)
  for ($i=1; $i -le $Attempts; $i++) {
    try { if (Test-Path $Path) { Remove-Directory-Robust -Path $Path }; if (-not (Test-Path $Path)) { return } } catch { Write-Warn "Attempt $i failed: $($_.Exception.Message)" }
    if ($i -lt $Attempts) { Start-Sleep -Seconds $DelaySeconds }
  }
  if (Test-Path $Path) { Write-Err "Failed to remove $Path after $Attempts attempts."; throw }
}

function Resolve-ApiBaseUrl { param([string]$ServerAppName,[string]$Provided); if ($Provided) { return $Provided }; if ($ServerAppName) { return "https://$ServerAppName.azurewebsites.net" }; return '' }

function Get-KuduCredentials {
  param([string]$AppName)
  try {
    $cred = az webapp deployment list-publishing-credentials --resource-group $ResourceGroupName --name $AppName | ConvertFrom-Json
    if ($cred -and $cred.scmUri -and $cred.publishingUserName -and $cred.publishingPassword) {
      $baseUrl = $cred.scmUri.TrimEnd('/')
      return @{ url = $baseUrl; user = $cred.publishingUserName; pass = $cred.publishingPassword }
    }
  } catch { Write-Warn "Failed to get publishing credentials: $($_.Exception.Message)" }
  $profiles = az webapp deployment list-publishing-profiles --resource-group $ResourceGroupName --name $AppName --output json | ConvertFrom-Json
  $scm = $profiles | Where-Object { $_.publishMethod -eq 'MSDeploy' -and $_.publishUrl -like '*.scm.azurewebsites.net*' } | Select-Object -First 1
  if (-not $scm) { $scm = $profiles | Select-Object -First 1 }
  if (-not $scm) { throw 'Publishing profile not found' }
  return @{ url = ('https://' + ($scm.publishUrl -replace ':443$', '')); user = $scm.userName; pass = $scm.userPWD }
}

function Kudu-ListPath {
  param([string]$AppName,[string]$Path)
  $creds = Get-KuduCredentials -AppName $AppName
  $endpoint = "$($creds.url)/api/vfs$Path"
  try {
    $pair = "$($creds.user):$($creds.pass)"
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($pair)
    $b64 = [Convert]::ToBase64String($bytes)
    $headers = @{ Authorization = "Basic $b64" }
    $resp = Invoke-RestMethod -Uri $endpoint -Headers $headers -Method Get
    return $resp
  } catch { Write-Warn "Kudu list failed for ${Path}: $($_.Exception.Message)"; return $null }
}

function Kudu-ZipDeploy {
  param([string]$AppName,[string]$ZipPath)
  $creds = Get-KuduCredentials -AppName $AppName
  $endpoint = "$($creds.url)/api/zipdeploy?isPackage=false&deployer=script"
  $pair = "$($creds.user):$($creds.pass)"
  $bytes = [System.Text.Encoding]::ASCII.GetBytes($pair)
  $b64 = [Convert]::ToBase64String($bytes)
  Write-Info "Posting zip to Kudu: $endpoint"
  # Use HttpClient stream upload (more reliable on Windows)
  $handler = New-Object System.Net.Http.HttpClientHandler
  $client = New-Object System.Net.Http.HttpClient($handler)
  $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Basic', $b64)
  $fs = [System.IO.File]::OpenRead($ZipPath)
  try {
    $content = New-Object System.Net.Http.StreamContent($fs)
    $null = $content.Headers.TryAddWithoutValidation('Content-Type','application/zip')
    $post = $client.PostAsync($endpoint, $content).GetAwaiter().GetResult()
    if (-not $post.IsSuccessStatusCode) {
      $body = $post.Content.ReadAsStringAsync().GetAwaiter().GetResult()
      throw "Kudu zipdeploy failed: $($post.StatusCode) $($post.ReasonPhrase) - $body"
    }
  } finally {
    if ($fs) { $fs.Dispose() }
    if ($client) { $client.Dispose() }
  }
  # Poll deployment status
  $statusUrl = "$($creds.url)/api/deployments/latest"
  $headers = @{ Authorization = "Basic $b64" }
  for ($i=1; $i -le 30; $i++) {
    Start-Sleep -Seconds 2
    try {
      $latest = Invoke-RestMethod -Uri $statusUrl -Headers $headers -Method Get
      if ($latest.status -eq 4) { Write-Info '[Kudu] Zip deploy succeeded'; return }
      if ($latest.status -eq 3) { throw "[Kudu] Zip deploy failed: $($latest.message)" }
    } catch { if ($i -eq 30) { throw } }
  }
  throw '[Kudu] Zip deploy status unknown after timeout'
}

function New-Or-Update-WebAppClient {
  param([string]$AppName)
  Write-Step "Client Web App: $AppName (ensure exists)"
  $exists = az webapp show --resource-group $ResourceGroupName --name $AppName --query name -o tsv 2>$null
  if (-not $exists) {
    if ($WhatIf) { Write-Info "[WhatIf] Would create Web App $AppName (Node runtime for static)"; return }
    Write-Info 'Creating Web App (Linux, Node runtime used for static hosting)'
    $planName = az appservice plan list --resource-group $ResourceGroupName --query "[0].name" -o tsv
    if (-not $planName) { Write-Err 'No App Service Plan found in resource group.'; exit 1 }
    az webapp create --resource-group $ResourceGroupName --plan $planName --name $AppName --runtime "NODE|$NodeVersion" | Out-Null
  } else { Write-Info 'Web App already exists' }
  if (-not $WhatIf) { az webapp config set --resource-group $ResourceGroupName --name $AppName --linux-fx-version "NODE|$NodeVersion" | Out-Null } else { Write-Info "[WhatIf] Would set linux-fx-version NODE|$NodeVersion" }
}

function New-Or-Update-WebAppServer {
  param([string]$AppName)
  Write-Step "Server Web App: $AppName (ensure exists)"
  $exists = az webapp show --resource-group $ResourceGroupName --name $AppName --query name -o tsv 2>$null
  if (-not $exists) {
    if ($WhatIf) { Write-Info "[WhatIf] Would create Web App $AppName (Node $NodeVersion)"; return }
    Write-Info 'Creating Web App (Linux, Node runtime)'
    $planName = az appservice plan list --resource-group $ResourceGroupName --query "[0].name" -o tsv
    if (-not $planName) { Write-Err 'No App Service Plan found in resource group.'; exit 1 }
    az webapp create --resource-group $ResourceGroupName --plan $planName --name $AppName --runtime "NODE|$NodeVersion" | Out-Null
  } else {
    Write-Info 'Web App already exists'
  }
  if (-not $WhatIf) {
    az webapp config set --resource-group $ResourceGroupName --name $AppName --linux-fx-version "NODE|$NodeVersion" | Out-Null
  } else {
    Write-Info "[WhatIf] Would set linux-fx-version NODE|$NodeVersion"
  }
}

function Build-Server {
  if ($NoBuild) { Write-Info 'Skipping server build (-NoBuild)'; return }
  Write-Step 'Building server'
  Push-Location $ServerDir
  if (-not $WhatIf) {
  if (Test-Path node_modules) { Write-Info 'Cleaning previous node_modules (server)'; Remove-Directory-Robust -Path (Join-Path $PWD 'node_modules') }
    npm ci
    npm run build
  } else { Write-Info '[WhatIf] Would run: npm ci && npm run build' }
  Pop-Location
}

function Package-Server {
  Write-Step 'Packaging server artifact'
  # Azure Deployment Strategy:
  # 1. Package WITH node_modules (self-contained, no build needed)
  # 2. Set SCM_DO_BUILD_DURING_DEPLOYMENT=false (Don't run build on Azure)
  # 3. Set ENABLE_ORYX_BUILD=false (Disable Oryx build system)
  # 4. Set WEBSITE_RUN_FROM_PACKAGE=0 (Extract to wwwroot)
  if (Test-Path $ServerPkgDir) { Remove-Directory-WithRetry -Path $ServerPkgDir }
  New-Item -ItemType Directory -Force -Path $ServerPkgDir | Out-Null
  Copy-Item (Join-Path $ServerDir 'package.json') $ServerPkgDir
  if (Test-Path (Join-Path $ServerDir 'package-lock.json')) { Copy-Item (Join-Path $ServerDir 'package-lock.json') $ServerPkgDir }
  if (Test-Path (Join-Path $ServerDir 'tsconfig.json')) { Copy-Item (Join-Path $ServerDir 'tsconfig.json') $ServerPkgDir }
  
  # Copy node_modules for self-contained deployment
  $nodeModules = Join-Path $ServerDir 'node_modules'
  if (Test-Path $nodeModules) {
    Write-Info 'Copying node_modules to package (self-contained deployment)...'
    Copy-Item $nodeModules $ServerPkgDir -Recurse -Force
  } else {
    Write-Err 'node_modules not found - please run npm install in server directory first'
    exit 1
  }
  
  # Copy dist and src folders
  $srcDistDir = Join-Path $ServerDir 'dist'
  $srcSrcDir = Join-Path $ServerDir 'src'
  if (Test-Path $srcDistDir) {
    Write-Info "Copying dist folder from $srcDistDir"
    Copy-Item $srcDistDir $ServerPkgDir -Recurse -Force
  } else {
    Write-Err "dist folder not found at $srcDistDir. Did the build succeed?"
    exit 1
  }
  if (Test-Path $srcSrcDir) {
    Write-Info "Copying src folder from $srcSrcDir"
    Copy-Item $srcSrcDir $ServerPkgDir -Recurse -Force
  } else {
    Write-Err "src folder not found at $srcSrcDir"
    exit 1
  }
  # Copy data directories needed by the application
  $distRoot = Join-Path $ServerPkgDir 'dist'
  # Mirror content into dist where runtime expects it
  $srcPersonas = Join-Path $ServerDir 'src/personas'
  $srcPrompts  = Join-Path $ServerDir 'src/prompts'
  $srcScenarios = Join-Path $ServerDir 'src/scenarios'
  $srcUtil = Join-Path $ServerDir 'src/util'
  if (Test-Path $srcPersonas) {
    Copy-Item $srcPersonas $ServerPkgDir -Recurse
    New-Item -ItemType Directory -Force -Path (Join-Path $distRoot 'personas') | Out-Null
    Copy-Item (Join-Path $srcPersonas '*') (Join-Path $distRoot 'personas') -Recurse -Force
  }
  if (Test-Path $srcPrompts) {
    Copy-Item $srcPrompts $ServerPkgDir -Recurse
    New-Item -ItemType Directory -Force -Path (Join-Path $distRoot 'prompts') | Out-Null
    Copy-Item (Join-Path $srcPrompts '*') (Join-Path $distRoot 'prompts') -Recurse -Force
  }
  if (Test-Path $srcScenarios) {
    # Place scenarios under dist to satisfy FileSyncDatabase
    New-Item -ItemType Directory -Force -Path (Join-Path $distRoot 'scenarios') | Out-Null
    Copy-Item (Join-Path $srcScenarios '*') (Join-Path $distRoot 'scenarios') -Recurse -Force
  }
  if (Test-Path $srcUtil) {
    # Ensure util (moods.json) is available under dist
    New-Item -ItemType Directory -Force -Path (Join-Path $distRoot 'util') | Out-Null
    Copy-Item (Join-Path $srcUtil '*') (Join-Path $distRoot 'util') -Recurse -Force
  }
  # List server package contents pre-install for diagnostics
  Write-Info 'Server package pre-install contents:'
  Get-ChildItem -Recurse -File $ServerPkgDir | Select-Object -First 20 | ForEach-Object { Write-Info " - $_" }
  
  # Verify node_modules is NOT present (should be excluded)
  if (Test-Path (Join-Path $ServerPkgDir 'node_modules')) {
    Write-Warn '[Package] node_modules found in package! Should be excluded for Azure build.'
  } else {
    Write-Info '[Package] ✓ node_modules correctly excluded (Azure will install)'
  }
  # Startup wrapper for diagnostic logging before loading main app
  $startupWrapper = @'
console.log('[startup] wrapper executing; cwd=' + process.cwd());
try {
  const fs = require('fs');
  const path = require('path');
  const rootFiles = fs.readdirSync('.');
  console.log('[startup] root files: ' + rootFiles.join(','));
  if (fs.existsSync('dist')) {
    const distList = fs.readdirSync('dist').slice(0,60);
    console.log('[startup] dist listing (first 60): ' + distList.join(','));
    if (!distList.includes('index.js')) console.log('[startup] WARNING dist/index.js missing');
  } else {
    console.log('[startup] dist directory MISSING');
  }
} catch(e) { console.error('[startup] error listing files', e); }
try { require('./dist/index.js'); } catch(e) { console.error('[startup] FAILED to require dist/index.js', e); throw e; }
'@
  Set-Content -LiteralPath (Join-Path $ServerPkgDir 'startup.js') -Value $startupWrapper -Encoding UTF8
  
  # Don't create any custom build scripts - we'll disable build entirely
  # The dist folder is already compiled and included in the package
  Write-Info 'Skipping custom build script - will disable Azure build process'
  
  # Skip npm ci here - let Azure install dependencies during deployment
  # if (-not $WhatIf) {
  #   Push-Location $ServerPkgDir
  #   npm ci --omit=dev 2>&1 | Out-Null
  #   Pop-Location
  # } else { Write-Info '[WhatIf] Would run: npm ci --omit=dev (in server_package)' }
  $zipPath = Join-Path $ArtifactsRoot 'server.zip'
  if (Test-Path $zipPath) { Remove-Item $zipPath }
  if (-not $WhatIf) {
    # Create zip using .NET API for better control
    Write-Info "Creating server.zip from $ServerPkgDir"
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($ServerPkgDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    # Local verification of server zip
    $verifyDir = Join-Path $ArtifactsRoot 'server_zip_verify'
    if (Test-Path $verifyDir) { Remove-Directory-WithRetry -Path $verifyDir }
    New-Item -ItemType Directory -Force -Path $verifyDir | Out-Null
    Expand-Archive -Path $zipPath -DestinationPath $verifyDir -Force
    $rootEntries = Get-ChildItem -Name $verifyDir
    Write-Info "[Verify] Server zip root entries: $($rootEntries -join ', ')"
    $missing = @()
    if (-not (Test-Path (Join-Path $verifyDir 'package.json'))) { $missing += 'package.json' }
    if (-not (Test-Path (Join-Path $verifyDir 'dist' 'index.js'))) { $missing += 'dist/index.js' }
    if (-not (Test-Path (Join-Path $verifyDir 'src'))) { $missing += 'src/' }
    if (-not (Test-Path (Join-Path $verifyDir 'tsconfig.json'))) { $missing += 'tsconfig.json' }
    if (-not (Test-Path (Join-Path $verifyDir 'startup.js'))) { $missing += 'startup.js' }
    if (Test-Path (Join-Path $verifyDir 'node_modules')) { Write-Warn '[Verify] node_modules found in zip (should be excluded)' }
    if ($missing.Count -gt 0) {
      Write-Err "Server package verification failed. Missing: $($missing -join ', ')"; exit 1
    } else { 
      Write-Info '[Verify] Server package contains package.json, dist/index.js, src/, tsconfig.json, startup.js'
      Write-Info '[Verify] node_modules excluded - Azure Oryx will install dependencies'
    }
    Remove-Directory-WithRetry -Path $verifyDir
  } else { Write-Info '[WhatIf] Would create server.zip from server_package contents' }
  return $zipPath
}

function Build-Client {
  if ($SkipClient) { return }
  if ($NoBuild) { Write-Info 'Skipping client build (-NoBuild)'; return }
  Write-Step 'Building client'
  Push-Location $ClientDir
  if (-not $WhatIf) {
  if (Test-Path node_modules) { Write-Info 'Cleaning previous node_modules (client)'; Remove-Directory-Robust -Path (Join-Path $PWD 'node_modules') }
    npm ci
    # Set build-time API var only if not using runtime endpoint (still outputs assets even if unused)
    $env:VITE_API_URL = $effectiveApiBaseUrl
    npm run build
  } else { Write-Info '[WhatIf] Would run: npm ci && npm run build (with VITE_API_URL set)' }
  Pop-Location
}

function Package-Client {
  if ($SkipClient) { return }
  Write-Step 'Packaging client artifact'
  if (Test-Path $ClientPkgDir) { Remove-Directory-WithRetry -Path $ClientPkgDir }
  New-Item -ItemType Directory -Force -Path $ClientPkgDir | Out-Null
  $distPath = Join-Path $ClientDir 'dist'
  if (-not (Test-Path $distPath)) { Write-Err 'Client dist/ not found. Did the build succeed?'; exit 1 }
  if ($PureStaticClient) {
    Write-Info 'Pure static client mode: copying dist assets and adding minimal server.js (no external deps)'
    Copy-Item (Join-Path $distPath '*') $ClientPkgDir -Recurse
    # Update config.js with the correct API URL
    $configJsPath = Join-Path $ClientPkgDir 'config.js'
    if (Test-Path $configJsPath) {
      $configJs = @"
// Runtime configuration that will be populated by environment variables
// This will be replaced with actual values during deployment
window.ENV = {
  VITE_API_URL: '$effectiveApiBaseUrl',
  RUNTIME_CONFIG_URL: '$effectiveApiBaseUrl/runtime-config'
};
"@
      Set-Content -LiteralPath $configJsPath -Value $configJs -Encoding UTF8
      Write-Info "Updated config.js with API URL: $effectiveApiBaseUrl"
    }
    $indexPath = Join-Path $ClientPkgDir 'index.html'
    if (Test-Path $indexPath) { Copy-Item -LiteralPath $indexPath -Destination (Join-Path $ClientPkgDir 'hostingstart.html') -Force }
    $fallbackSource = Join-Path (Join-Path $ClientDir 'public') '404.html'
    $fallbackDest = Join-Path $ClientPkgDir '404.html'
    if ((Test-Path -LiteralPath $fallbackSource) -and -not (Test-Path -LiteralPath $fallbackDest)) { Copy-Item -LiteralPath $fallbackSource -Destination $fallbackDest }
    # Minimal dependency-free static server with diagnostics
    $staticServer = @'
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const port = process.env.PORT || 8080;
function log(m){console.log('[static] '+m);} 
function send(res,status,body,type='text/plain'){res.writeHead(status,{ 'Content-Type': type });res.end(body);} 
function serveFile(file,res){
  fs.readFile(file,(err,data)=>{ if(err){
      if(err.code==='ENOENT'){ log('404 '+file); return send(res,404,'Not Found'); }
      log('500 read error '+file+' '+err.code); return send(res,500,'Server Error'); }
    const ext = path.extname(file).toLowerCase();
    const map = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8' };
    send(res,200,data,map[ext]||'application/octet-stream');
  });
}
function ensureIndex(){ const idx = path.join(root,'index.html'); if(!fs.existsSync(idx)){ log('index.html MISSING at startup'); const listing = fs.readdirSync(root); log('root listing: '+listing.join(',')); } else { log('index.html present'); } }
ensureIndex();
const server = http.createServer((req,res)=>{
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath==='/healthz') return send(res,200,JSON.stringify({status:'ok',time:new Date().toISOString()}),'application/json');
  let target = path.join(root, urlPath === '/' ? 'index.html' : urlPath.substring(1));
  log('Request: '+urlPath+' -> '+target);
  try {
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target,'index.html');
  } catch(e){ log('stat error '+target+' '+e.message); }
  // Only fallback to index.html for HTML navigation requests (SPA routing)
  if (!fs.existsSync(target)) { 
    const ext = path.extname(urlPath);
    if (!ext || ext === '.html') {
      log('SPA fallback: '+urlPath+' -> index.html');
      target = path.join(root,'index.html');
    } else {
      log('Asset not found: '+target);
      return send(res,404,'Not Found');
    }
  }
  serveFile(target,res);
});
server.listen(port, ()=> log('listening on '+port+' root='+root));
'@
    Set-Content -LiteralPath (Join-Path $ClientPkgDir 'server.js') -Value $staticServer -Encoding UTF8
    # Provide bare package.json only if needed (not strictly required but helps clarity)
  $pkgJson = '{"name":"voice-ai-client-static","version":"1.0.0","private":true,"scripts":{"start":"node server.js"}}'
    Set-Content -LiteralPath (Join-Path $ClientPkgDir 'package.json') -Value $pkgJson -Encoding UTF8
    $critical = @('index.html','server.js')
    foreach ($c in $critical) { if (-not (Test-Path (Join-Path $ClientPkgDir $c))) { Write-Err "Client packaging missing required item (static mode): $c"; exit 1 } }
  } else {
    Copy-Item (Join-Path $distPath '*') $ClientPkgDir -Recurse
    # Update config.js with the correct API URL
    $configJsPath = Join-Path $ClientPkgDir 'config.js'
    if (Test-Path $configJsPath) {
      # Delete the original config.js and create it fresh to avoid any caching
      Remove-Item -LiteralPath $configJsPath -Force
      $configJs = @"
// Runtime configuration that will be populated by environment variables
// This will be replaced with actual values during deployment
window.ENV = {
  VITE_API_URL: '$effectiveApiBaseUrl',
  RUNTIME_CONFIG_URL: '$effectiveApiBaseUrl/runtime-config'
};
"@
      Set-Content -LiteralPath $configJsPath -Value $configJs -Encoding UTF8
      Write-Info "Updated config.js with API URL: $effectiveApiBaseUrl"
      # Verify what was actually written
      $actualContent = Get-Content -LiteralPath $configJsPath -Raw
      Write-Info "Actual config.js content: $actualContent"
    }
    $fallbackSource = Join-Path (Join-Path $ClientDir 'public') '404.html'
    $fallbackDest = Join-Path $ClientPkgDir '404.html'
    if ((Test-Path -LiteralPath $fallbackSource) -and -not (Test-Path -LiteralPath $fallbackDest)) { Copy-Item -LiteralPath $fallbackSource -Destination $fallbackDest }
    $serverJs = @'
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 8080;
const root = __dirname;
function log(msg) { console.log(`[client-static] ${msg}`); }
app.use((req,res,next)=>{ log(`${req.method} ${req.url}`); next(); });
app.get('/healthz', (_req,res)=> res.json({ status:'ok', time:new Date().toISOString() }));
app.get('/client-config', (_req,res)=> res.json({ 
  runtimeConfigUrl: process.env.RUNTIME_CONFIG_URL || 'https://msvoiceaichat-server.azurewebsites.net/runtime-config',
  apiBaseUrl: process.env.VITE_API_URL || 'https://msvoiceaichat-server.azurewebsites.net'
}));
app.use(express.static(root, { index: 'index.html', extensions:['html'] }));
app.get('*', (req,res)=>{
  const indexPath = path.join(root,'index.html');
  if (!fs.existsSync(indexPath)) { log(`index.html missing at ${indexPath}`); return res.status(500).send('index.html not found'); }
  res.sendFile(indexPath, err => { if (err) { log(`Error sending index.html: ${err.message}`); if (!res.headersSent) res.status(500).send('Failed to load application'); }});
});
app.listen(port, () => log(`listening on ${port} (root=${root})`));
'@
    Set-Content -LiteralPath (Join-Path $ClientPkgDir 'server.js') -Value $serverJs -Encoding UTF8
    $clientPackageJson = @'
{
  "name": "voice-ai-client-static",
  "version": "1.0.0",
  "private": true,
  "scripts": { "start": "node server.js" },
  "dependencies": { "express": "^4.19.2" }
}
'@
    Set-Content -LiteralPath (Join-Path $ClientPkgDir 'package.json') -Value $clientPackageJson -Encoding UTF8
  if (-not $WhatIf) { Push-Location $ClientPkgDir; npm install --omit=dev 2>&1 | Out-Null; Pop-Location } else { Write-Info '[WhatIf] Would npm install express (production only) in client package' }
    $critical = @('index.html','server.js','package.json','node_modules')
    foreach ($c in $critical) { if (-not (Test-Path (Join-Path $ClientPkgDir $c))) { Write-Err "Client packaging missing required item: $c"; exit 1 } }
  }
  $manifestPath = Join-Path $ClientPkgDir 'client_deploy_manifest.txt'
  (Get-ChildItem -Recurse -Name $ClientPkgDir | Out-String) | Set-Content -LiteralPath $manifestPath
  Write-Info "Client package root contents:"; Get-ChildItem -Force $ClientPkgDir | ForEach-Object { Write-Info " - $_" }
  $zipPath = Join-Path $ArtifactsRoot 'client.zip'
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  if (-not $WhatIf) {
    # Use .NET ZipFile for reliable packaging (same as server)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($ClientPkgDir, $zipPath, [System.IO.Compression.CompressionLevel]::Fastest, $false)
    Write-Info "Client zip created: $zipPath (Size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB)"
    $verifyDir = Join-Path $ArtifactsRoot 'client_zip_verify'
    if (Test-Path $verifyDir) { Remove-Directory-WithRetry -Path $verifyDir }
    New-Item -ItemType Directory -Force -Path $verifyDir | Out-Null
    Expand-Archive -Path $zipPath -DestinationPath $verifyDir -Force
    $rootFiles = Get-ChildItem -Name $verifyDir
    Write-Info "[Verify] Client zip root entries: $($rootFiles -join ', ')"
    if (-not (Test-Path (Join-Path $verifyDir 'index.html'))) { Write-Err '[Verify] index.html missing in zip root after compression'; exit 1 }
    if (-not $PureStaticClient -and -not (Test-Path (Join-Path $verifyDir 'server.js'))) { Write-Err '[Verify] server.js missing in zip root (expected in non-static mode)'; exit 1 }
    if ($PureStaticClient -and -not (Test-Path (Join-Path $verifyDir 'hostingstart.html'))) { Write-Warn '[Verify] hostingstart.html missing (optional but recommended)' }
    Remove-Directory-WithRetry -Path $verifyDir
  } else { Write-Info '[WhatIf] Would create client.zip from client_package root' }
  return $zipPath
}

function Deploy-Client {
  param([string]$AppName,[string]$ZipPath)
  if ($SkipClient) { return }
  Write-Step "Deploying client to $AppName"
  if ($WhatIf) { Write-Info "[WhatIf] Would deploy $ZipPath to $AppName via Kudu ZipDeploy" } else {
    try {
      Kudu-ZipDeploy -AppName $AppName -ZipPath $ZipPath
    } catch {
      Write-Warn "Kudu ZipDeploy failed: $($_.Exception.Message). Falling back to az webapp deploy."
      az webapp deploy --resource-group $ResourceGroupName --name $AppName --src-path $ZipPath --type zip | Out-Null
    }
  }
  $settings = @(
    'NODE_ENV=production'
    'WEBSITE_RUN_FROM_PACKAGE=1'
    "WEBSITE_NODE_DEFAULT_VERSION=$NodeVersion"
    "VITE_API_URL=$effectiveApiBaseUrl"
    "RUNTIME_CONFIG_URL=$effectiveApiBaseUrl/runtime-config"
    'SCM_DO_BUILD_DURING_DEPLOYMENT=false'
    'ENABLE_ORYX_BUILD=false'
    'PORT=8080'
  )
  if ($WhatIf) {
    Write-Info "[WhatIf] Would set client app settings: $($settings -join ', ')"
  } else {
    az webapp config appsettings set --resource-group $ResourceGroupName --name $AppName --settings $settings | Out-Null
    if (Test-Path (Join-Path $ArtifactsRoot 'client_package' 'server.js')) {
      Write-Info 'Setting startup command for client (node server.js)'
      az webapp config set --resource-group $ResourceGroupName --name $AppName --startup-file "node server.js" | Out-Null
    } else { Write-Warn 'server.js missing after packaging (unexpected)'; }
    if ($EnableLogs) {
      Write-Info 'Enabling application log streaming (filesystem) for client'
      az webapp log config --resource-group $ResourceGroupName --name $AppName --application-logging filesystem --level information --docker-container-logging off | Out-Null
    }
  }

  # Mirror placeholder logic: ensure VITE_API_URL exists (already set) and add any additional future client vars if missing.
  $clientPlaceholderKeys = @(
    'VITE_API_URL',
    'RUNTIME_CONFIG_URL'
  )
  if (-not $WhatIf) {
    $existing = az webapp config appsettings list --resource-group $ResourceGroupName --name $AppName | ConvertFrom-Json
    $existingNames = @()
    if ($existing) { $existingNames = $existing | ForEach-Object { $_.name } }
    $toAdd = @()
    foreach ($k in $clientPlaceholderKeys) {
      if (-not ($existingNames -contains $k)) { $toAdd += "$k=" }
    }
    if ($toAdd.Count -gt 0) {
      Write-Info "Adding client placeholder empty settings: $($toAdd -join ', ')"
      az webapp config appsettings set --resource-group $ResourceGroupName --name $AppName --settings $toAdd | Out-Null
    } else {
      Write-Info 'No client placeholder settings needed'
    }
  } else {
    Write-Info "[WhatIf] Would ensure client placeholder settings exist for: $($clientPlaceholderKeys -join ', ')"
  }

  # Post-deploy remote inspection (optional)
  if (-not $WhatIf -and $PostDeployInspect) {
    Write-Step "Client remote file listing (top-level)"
    try {
      az webapp ssh --resource-group $ResourceGroupName --name $AppName --command "bash -c 'ls -1 /home/site/wwwroot | head -40'" | Out-Null
      az webapp ssh --resource-group $ResourceGroupName --name $AppName --command "bash -c 'test -f /home/site/wwwroot/server.js && echo server.js:OK || echo server.js:MISSING'" | Out-Null
      az webapp ssh --resource-group $ResourceGroupName --name $AppName --command "bash -c 'test -f /home/site/wwwroot/index.html && echo index.html:OK || echo index.html:MISSING'" | Out-Null
    } catch {
      Write-Warn "Remote inspection failed: $($_.Exception.Message)"
    }
  }
}

function Verify-Client {
  param([string]$AppName)
  if ($SkipClient -or $WhatIf) { return }
  Write-Step 'Verifying client root URL'
  $url = "https://$AppName.azurewebsites.net/"
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
    Write-Info "Client root status: $($resp.StatusCode)"
  } catch {
    Write-Warn "Client verification failed: $($_.Exception.Message)"
  }
}

function Deploy-Server {
  param([string]$AppName,[string]$ZipPath,[string]$ApiBaseUrl)
  Write-Step "Deploying server to $AppName"
  if ($WhatIf) { Write-Info "[WhatIf] Would deploy $ZipPath to $AppName via Kudu ZipDeploy" } else {
    try {
      Kudu-ZipDeploy -AppName $AppName -ZipPath $ZipPath
    } catch {
      Write-Warn "Kudu ZipDeploy failed: $($_.Exception.Message). Falling back to az webapp deploy."
      az webapp deploy --resource-group $ResourceGroupName --name $AppName --src-path $ZipPath --type zip | Out-Null
    }
  }
  $settings = @(
    'NODE_ENV=production'
    'PORT=8080'
    "WEBSITE_NODE_DEFAULT_VERSION=$NodeVersion"
    'SQLITE_DB_PATH=/home/site/data/voice-ai-documents.db'
    'SCM_DO_BUILD_DURING_DEPLOYMENT=false'
    'ENABLE_ORYX_BUILD=false'
    'WEBSITE_RUN_FROM_PACKAGE=0'
  )
  if ($ApiBaseUrl) { $settings += "API_BASE_URL=$ApiBaseUrl" }
  if ($AzureSpeechKey) { $settings += "AZURE_SPEECH_KEY=$AzureSpeechKey" }
  if ($AzureSpeechRegion) { $settings += "AZURE_SPEECH_REGION=$AzureSpeechRegion" }
  if ($EnableApplicationInsights) {
    $settings += 'ApplicationInsightsAgent_EXTENSION_VERSION=~3'
    $settings += 'XDT_MicrosoftApplicationInsights_Mode=default'
    if ($ApplicationInsightsConnectionString) {
      $settings += "APPLICATIONINSIGHTS_CONNECTION_STRING=$ApplicationInsightsConnectionString"
    }
  }
  if ($WhatIf) {
    Write-Info "[WhatIf] Would set app settings: $($settings -join ', ')"; Write-Info '[WhatIf] Would set startup command node startup.js'
  } else {
    az webapp config appsettings set --resource-group $ResourceGroupName --name $AppName --settings $settings | Out-Null
    Write-Info 'Setting explicit startup command (node startup.js)'
    az webapp config set --resource-group $ResourceGroupName --name $AppName --startup-file "node startup.js" | Out-Null
    Write-Info 'Enabling WebSocket support for Realtime API'
    az webapp config set --resource-group $ResourceGroupName --name $AppName --web-sockets-enabled true | Out-Null
    if ($EnableLogs) {
      Write-Info 'Enabling application log streaming (filesystem)'
      az webapp log config --resource-group $ResourceGroupName --name $AppName --application-logging filesystem --level information --docker-container-logging off | Out-Null
    }
     if ($PostDeployInspect) {
       Write-Step 'Server remote inspection via Kudu VFS'
       $root = Kudu-ListPath -AppName $AppName -Path '/site/wwwroot/'
       if ($root) {
         $names = $root | ForEach-Object { $_.name }
         Write-Info ("[Kudu] wwwroot: " + ($names -join ', '))
       }
       $dist = Kudu-ListPath -AppName $AppName -Path '/site/wwwroot/dist/'
       if ($dist) {
         $dnames = $dist | ForEach-Object { $_.name }
         Write-Info ("[Kudu] dist: " + ($dnames -join ', '))
       }
     }
  }

  # Ensure placeholder (empty) settings exist for optional/secret vars referenced in code but not explicitly set above.
  $placeholderKeys = @(
    'API_BASE_URL',            # May already be set above
    'VITE_API_URL',
    'DATABASE_PATH',
    'USE_SEED_DATA_MODE',
    'SKIP_RESTORE',
    'AZURE_STORAGE_ACCOUNT_NAME',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_KEY',
    'AZURE_OPENAI_DEPLOYMENT',
    'AZURE_OPENAI_MODEL',      # Default handled in code but expose for override
    'AZURE_OPENAI_REALTIME_DEPLOYMENT',  # Realtime API deployment name (e.g., gpt-realtime)
    'AZURE_SPEECH_KEY',
    'AZURE_SPEECH_REGION',     # Default eastus in code
    'AZURE_AI_FOUNDRY_PROJECT_ENDPOINT',
    'AZURE_EVALUATION_AGENT_ID',
    'MESSAGE_WINDOW_SIZE',
    'AUTH_USERS',
    'SESSION_SECRET',
    'SESSION_DURATION_HOURS',
    'RATE_LIMIT_PER_MINUTE',
    'AUTH_ENABLED',
    'PROMPTY_TEMPLATE',
    'APPLICATIONINSIGHTS_CONNECTION_STRING'  # Application Insights connection string
  )

  if (-not $WhatIf) {
    $existing = az webapp config appsettings list --resource-group $ResourceGroupName --name $AppName | ConvertFrom-Json
    $existingNames = @()
    if ($existing) { $existingNames = $existing | ForEach-Object { $_.name } }
    $toAdd = @()
    foreach ($k in $placeholderKeys) {
      if (-not ($existingNames -contains $k)) { $toAdd += "$k=" }
    }
    if ($toAdd.Count -gt 0) {
      Write-Info "Adding placeholder empty settings: $($toAdd -join ', ')"
      az webapp config appsettings set --resource-group $ResourceGroupName --name $AppName --settings $toAdd | Out-Null
    } else {
      Write-Info 'No placeholder settings needed'
    }
  } else {
    Write-Info "[WhatIf] Would ensure placeholder settings exist for: $($placeholderKeys -join ', ') (only adding those missing)"
  }
}

function Verify-Server {
  param([string]$AppName)
  if ($WhatIf) { Write-Info '[WhatIf] Skipping verification'; return }
  Write-Step 'Verifying /healthz'
  $healthUrl = "https://$AppName.azurewebsites.net/healthz"
  try {
    $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 30
    Write-Info "Health check status: $($resp.StatusCode)"
  } catch {
    Write-Warn "Health check failed: $($_.Exception.Message)"
  }
}

Write-Step 'Prerequisite Validation'
Ensure-AzCli
Ensure-Login
Write-Info "Subscription: $SubscriptionId"

$effectiveApiBaseUrl = Resolve-ApiBaseUrl -ServerAppName $ServerAppName -Provided $ApiBaseUrl
Write-Info "Effective API Base URL: $effectiveApiBaseUrl"

if (-not $SkipServer) {
  New-Or-Update-WebAppServer -AppName $ServerAppName
  Build-Server
  $serverZip = Package-Server
  Deploy-Server -AppName $ServerAppName -ZipPath $serverZip -ApiBaseUrl $effectiveApiBaseUrl
  Verify-Server -AppName $ServerAppName
} else {
  Write-Info 'Skipping server deployment (-SkipServer)'
}

if (-not $SkipClient) {
  New-Or-Update-WebAppClient -AppName $ClientAppName
  Build-Client
  $clientZip = Package-Client
  Deploy-Client -AppName $ClientAppName -ZipPath $clientZip
  Verify-Client -AppName $ClientAppName
} else {
  Write-Info 'Skipping client deployment (-SkipClient)'
}

Write-Step 'Summary'
Write-Host 'Actions complete.' -ForegroundColor Green
if ($SkipServer) { Write-Host ' - Server: skipped' } else { Write-Host ' - Server: deployed (or simulated via WhatIf)' }
if ($SkipClient) { Write-Host ' - Client: skipped' } else { Write-Host ' - Client: deployed (or simulated via WhatIf)' }
Write-Host " - API Base URL: $effectiveApiBaseUrl"

if ($WhatIf) { Write-Warn 'NOTE: WhatIf mode performed no changes.' }
