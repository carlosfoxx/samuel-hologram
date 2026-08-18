import asyncio
import edge_tts
import os
import uuid
import time


class TTSEngine:
    def __init__(self, voice: str = "pt-BR-AntonioNeural"):
        self.voice = voice
        self.audio_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "audio_cache")
        os.makedirs(self.audio_dir, exist_ok=True)

    async def _generate(self, text: str, output_path: str):
        communicate = edge_tts.Communicate(text, self.voice, rate="+0%", pitch="-2Hz")
        await communicate.save(output_path)

    def generate(self, text: str) -> str:
        cleaned = text.replace("*", "").replace("(", "").replace(")", "").strip()
        if not cleaned:
            return None, None

        audio_id = str(uuid.uuid4())[:12]
        output_path = os.path.join(self.audio_dir, f"{audio_id}.mp3")

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(asyncio.run, self._generate(cleaned, output_path))
                    future.result(timeout=30)
            else:
                loop.run_until_complete(self._generate(cleaned, output_path))
        except RuntimeError:
            asyncio.run(self._generate(cleaned, output_path))

        if not os.path.exists(output_path):
            return None, None

        return audio_id, output_path

    def get_audio_path(self, audio_id: str) -> str:
        path = os.path.join(self.audio_dir, f"{audio_id}.mp3")
        if os.path.exists(path):
            return path
        return None

    def cleanup(self, max_age_seconds: int = 300):
        now = time.time()
        for f in os.listdir(self.audio_dir):
            if f.endswith(".mp3"):
                fp = os.path.join(self.audio_dir, f)
                if now - os.path.getmtime(fp) > max_age_seconds:
                    try:
                        os.remove(fp)
                    except OSError:
                        pass
