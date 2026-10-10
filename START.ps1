$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$runtime = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($runtime) { $runtime.Source } else { Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js 22 이상을 설치해 주세요.' }
Write-Host '브라우저에서 http://127.0.0.1:4173 을 열어 주세요. 종료: Ctrl+C'
& $nodePath server.mjs
