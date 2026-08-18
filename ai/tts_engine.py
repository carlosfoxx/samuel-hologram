import asyncio
import edge_tts
import tempfile
import os
import uuid


class TTSEngine:
    def __init__(self, voice: str = "pt-BR-AntonioNeural"):
        self.voice = voice
        self.audio_dir = os.path.join(tempfile.gettempdir(), "samuel_hologram_tts")
        os.makedirs(self.audio_dir, exist_ok=True)

    async def _generate(self, text: str, output_path: str):
        communicate = edge_tts.Communicate(text, self.voice, rate="+0%", pitch="-2Hz")
        await communicate.save(output_path)

    def generate(self, text: str) -> str:
        cleaned = text.replace("*", "").replace("(", "").replace(")", "").strip()
        if not cleaned:
            return None

        audio_id = str(uuid.uuid4())[:12]
        output_path = os.path.join(self.audio_dir, f"{audio_id}.mp3")

        asyncio.run(self._generate(cleaned, output_path))

        return audio_id, output_path

    def get_audio_path(self, audio_id: str) -> str:
        path = os.path.join(self.audio_dir, f"{audio_id}.mp3")
        if os.path.exists(path):
            return path
        return None

    def cleanup(self, max_age_seconds: int = 300):
        import time
        now = time.time()
        for f in os.listdir(self.audio_dir):
            if f.endswith(".mp3"):
                fp = os.path.join(self.audio_dir, f)
                if now - os.path.getmtime(fp) > max_age_seconds:
                    os.remove(fp)
