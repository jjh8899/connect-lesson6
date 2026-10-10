"""Generate reusable dialogue WAVs; network is used only at generation time."""
import asyncio
import hashlib
import json
import shutil
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / '.voice-deps'))
import edge_tts
import imageio_ffmpeg

CACHE = ROOT / '.voice-cache'
STAGE = ROOT / 'outputs' / 'natural-dialogues'
BACKUP = ROOT / 'audio-backup-desktop'
for folder in (CACHE, STAGE, BACKUP):
    folder.mkdir(parents=True, exist_ok=True)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
JOBS = [j for j in json.loads((ROOT / 'audio-jobs.json').read_text(encoding='utf-8-sig')) if not j['id'].startswith('reading-')]

def cast(role):
    if role == 'B':
        return 'en-US-BrianNeural', '+0%', '+8Hz'
    if role in ('G', 'Linda'):
        return 'en-US-AriaNeural', '+5%', '+10Hz'
    if role == 'Arin':
        return 'en-US-JennyNeural', '+2%', '+5Hz'
    return 'en-US-JennyNeural', '+0%', '+0Hz'

async def synthesize(job):
    chunks = [b'\0\0' * 4800]
    roles = []
    for role, text in job['lines']:
        if role == 'SFX':
            continue
        voice, rate, pitch = cast(role)
        # Keep empathy lines measured, rather than making sad situations sound excited.
        if any(word in text.lower() for word in ('sad', 'sorry', 'fever', 'feel bad', 'feel blue', "don't feel good")):
            rate = '+0%'
        digest = hashlib.sha256(json.dumps([text, voice, rate, pitch]).encode()).hexdigest()
        mp3 = CACHE / (digest + '.mp3')
        for attempt in range(3):
            try:
                if not mp3.exists() or mp3.stat().st_size < 1000:
                    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(mp3))
                pcm = subprocess.run([FFMPEG, '-v', 'error', '-i', str(mp3), '-f', 's16le', '-ac', '1', '-ar', '24000', 'pipe:1'], check=True, capture_output=True).stdout
                if len(pcm) < 2400:
                    raise ValueError('Missing audio frames')
                break
            except Exception:
                if attempt == 2:
                    raise
                mp3.unlink(missing_ok=True)
                await asyncio.sleep(2 + attempt)
        chunks.extend([pcm, b'\0\0' * 8400])
        roles.append({'role': role, 'voice': voice, 'rate': rate, 'pitch': pitch})
    target = STAGE / (job['id'] + '.wav')
    with wave.open(str(target), 'wb') as out:
        out.setparams((1, 2, 24000, 0, 'NONE', 'not compressed'))
        out.writeframes(b''.join(chunks))
    print(job['id'] + ' ready', flush=True)
    return {'file': target.name, 'cast': roles, 'seconds': round(sum(map(len, chunks)) / 48000, 2)}

async def main():
    semaphore = asyncio.Semaphore(2)
    async def bounded(job):
        async with semaphore:
            return await synthesize(job)
    files = await asyncio.gather(*(bounded(j) for j in JOBS))
    # Publish only when every replacement has successfully generated.
    for item in files:
        target = ROOT / 'dist' / 'audio' / item['file']
        if not (BACKUP / target.name).exists():
            shutil.copy2(target, BACKUP / target.name)
        shutil.copy2(STAGE / target.name, target)
    manifest = {'engine': 'Microsoft Edge neural TTS; generated online, played locally', 'source': 'User supplied Lesson 6 scripts; text unchanged', 'note': 'Synthetic voices selected for youthful character; not actual student recordings. Reading audio unchanged.', 'files': files}
    (ROOT / 'dialogue-voice-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Published all 12 listening tracks.', flush=True)

if __name__ == '__main__':
    asyncio.run(main())
