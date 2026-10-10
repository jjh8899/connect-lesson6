$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$audioRoot = Join-Path $PSScriptRoot 'dist/audio'
[IO.Directory]::CreateDirectory($audioRoot) | Out-Null
$jobs = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'audio-jobs.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Zira Desktop')
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
try {
  foreach ($job in $jobs) {
    $parts = @('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><break time="300ms"/>')
    foreach ($line in $job.lines) {
      if ($line[0] -eq 'SFX') { continue }
      $pitch = if ($line[0] -eq 'B' -or $line[0] -eq 'Arin') { '-12%' } else { '+0%' }
      $text = [System.Security.SecurityElement]::Escape([string]$line[1])
      $parts += '<prosody rate="-8%" pitch="' + $pitch + '">' + $text + '</prosody><break time="500ms"/>'
    }
    $parts += '</speak>'
    $outputFile = Join-Path $audioRoot ($job.id + '.wav')
    $synth.SetOutputToWaveFile($outputFile, $format)
    $synth.SpeakSsml(($parts -join ''))
    $synth.SetOutputToNull()
    Write-Output ($job.id + ' generated: ' + (Get-Item -LiteralPath $outputFile).Length + ' bytes')
  }
} finally { $synth.Dispose() }
