import os
import tempfile
import asyncio
import logging
import edge_tts
import fal_client

logger = logging.getLogger(__name__)

VOICES = [
    "pt-BR-AntonioNeural",
    "pt-BR-FranciscoNeural",
    "pt-BR-DONATO neural",
]

FALLBACK_VOICE = "pt-BR-AntonioNeural"


class FalClient:
    def __init__(self, api_key: str, image_path: str):
        os.environ["FAL_KEY"] = api_key
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

    def _upload_file(self, file_path):
        try:
            with open(file_path, "rb") as f:
                url = fal_client.upload_file(f)
            return url
        except Exception as e:
            logger.error(f"Upload falhou: {e}")
            return None

    def _call_sadtalker(self, image_url, audio_url):
        try:
            result = fal_client.run(
                "fal-ai/sadtalker",
                arguments={
                    "source_image_url": image_url,
                    "driven_audio_url": audio_url,
                    "still_mode": True,
                    "preprocess": "full",
                },
            )
            video_info = result.get("video", {})
            return video_info.get("url")
        except Exception as e:
            logger.error(f"SadTalker falhou: {e}")
            return None

    def _download_video(self, video_url):
        import requests
        response = requests.get(video_url, timeout=60)
        if response.status_code == 200:
            tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
            tmp.write(response.content)
            tmp.close()
            return tmp.name
        return None

    def speak(self, text):
        audio_path = None
        video_path = None

        try:
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                audio_path = tmp.name

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self._generate_audio(text, audio_path))
            loop.close()

            if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 100:
                self._cleanup(audio_path)
                return None, None

            logger.info("Fazendo upload do audio...")
            audio_url = self._upload_file(audio_path)
            if not audio_url:
                self._cleanup(audio_path)
                return None, None

            logger.info("Fazendo upload da imagem...")
            image_url = self._upload_file(self.image_path)
            if not image_url:
                self._cleanup(audio_path)
                return None, None

            logger.info("Gerando video com SadTalker...")
            video_url = self._call_sadtalker(image_url, audio_url)
            self._cleanup(audio_path)
            if not video_url:
                return None, None

            logger.info("Baixando video...")
            video_path = self._download_video(video_url)
            return audio_path, video_path

        except Exception as e:
            logger.error(f"Erro no speak: {e}")
            self._cleanup(audio_path)
            self._cleanup(video_path)
            return None, None

    def _cleanup(self, path):
        if path and os.path.exists(path):
            try:
                os.unlink(path)
            except Exception:
                pass
