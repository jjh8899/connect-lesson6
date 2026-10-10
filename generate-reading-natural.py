"""Generate four reading tracks with a bright adult female synthetic voice."""
import asyncio
import json
import shutil
import wave
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('dialogue_generator', ROOT / 'generate-dialogue-natural.py')
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
generator.cast = lambda role: ('en-US-JennyNeural', '+0%', '+3Hz')
generator.STAGE = ROOT / 'outputs' / 'natural-reading'
generator.STAGE.mkdir(parents=True, exist_ok=True)

async def main():
    jobs = [j for j in json.loads((ROOT / 'audio-jobs.json').read_text(encoding='utf-8-sig')) if j['id'].startswith('reading-')]
    files = []
    for job in jobs:
        files.append(await generator.synthesize(job))
    # Keep the old recordings until all four replacements are ready.
    for item in files:
        target = ROOT / 'dist/audio' / item['file']
        backup = generator.BACKUP / target.name
        if not backup.exists():
            
            if target.exists(): shutil.copy2(target, backup)
        shutil.copy2(generator.STAGE / target.name, target)
    (ROOT / 'reading-voice-manifest.json').write_text(json.dumps({
        'engine': 'Microsoft Edge neural TTS; generated online, played locally',
        'voice': 'en-US-JennyNeural',
        'direction': 'Bright young adult female impression; synthetic voice, no exact age claimed.',
        'source': 'User supplied reading introduction, three stories and their advice; text unchanged',
        'files': files
    }, ensure_ascii=False, indent=2), encoding='utf-8')
    path = ROOT / 'audio-manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8-sig'))
    manifest['voice'] = 'Listening: Edge neural Aria/Brian/Jenny; Reading: Edge neural Jenny. Synthetic audio.'
    for item in manifest['files']:
        path_audio = ROOT / 'dist/audio' / item['file']
        with wave.open(str(path_audio)) as audio:
            item.update(seconds=round(audio.getnframes()/audio.getframerate(),2), sampleRate=audio.getframerate(), channels=audio.getnchannels(), bytes=path_audio.stat().st_size)
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Published four natural reading tracks.', flush=True)

if __name__ == '__main__':
    asyncio.run(main())
