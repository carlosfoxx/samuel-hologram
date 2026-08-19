import os
import tempfile
import asyncio
import logging
import edge_tts
import requests

logger = logging.getLogger(__name__)

VOICES = [
    "pt-BR-AntonioNeural",
    "pt-BR-FranciscoNeural",
    "pt-BR-DONATO neural",
]

FALLBACK_VOICE = "pt-BR-AntonioNeural"


class KaggleClient:
    def __init__(self, api_url: str, image_path: str):
        self.api_url = api_url.rstrip("/")
        self.image_path = image_path

    def _choose_voice(self, text):
        for v in VOICES:
            if any(name in v.lower() for name in ["antonio", "francisco", "donato"]):
                return v
        return FALLBACK_VOICE

    async def _generate_audio(self, text, output_path):
        voice = self._choose_voice(text)
        communicate = edge_tts.Communicate(text, voice, rate="+10%", pitch="-5Hz")
        await communicate.save(output_path)
        return output_path

    def _send_to_kaggle(self, audio_path):
        url = f"{self.api_url}/animate"
        with open(audio_path, "rb") as af, open(self.image_path, "rb") as imgf:
            files = {
                "audio": ("speech.mp3", af, "audio/mpeg"),
                "image": ("samuel.webp", imgf, "image/webp"),
            }
            response = requests.post(url, files=files, timeout=90)

        if response.status_code == 200:
            content_type = response.headers.get("content-type", "")
            if "video" in content_type:
                tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
                tmp.write(response.content)
                tmp.close()
                return tmp.name
            else:
                data = response.json()
                logger.error(f"Kaggle erro: {data}")
                return None
        else:
            logger.error(f"Kaggle HTTP {response.status_code}")
            return None

    def speak(self, text):
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            audio_path = tmp.name

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self._generate_audio(text, audio_path))
            loop.close()

            if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 100:
                return None, None

            video_path = self._send_to_kaggle(audio_path)
            return audio_path, video_path

        except Exception as e:
            logger.error(f"Erro no speak: {e}")
            return None, None
        finally:
            if os.path.exists(audio_path):
                os.unlink(audio_path)
