import os
import tempfile
import asyncio
import logging
import edge_tts
import fal_client
from PIL import Image

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
        self._png_path = self._convert_to_png(image_path)
        logger.info(f"FalClient init OK | image: {self._png_path}")

    def _convert_to_png(self, image_path):
        try:
            if image_path.lower().endswith(".webp"):
                png_path = image_path.rsplit(".", 1)[0] + ".png"
                if not os.path.exists(png_path):
                    img = Image.open(image_path)
                    img.save(png_path, "PNG")
                    logger.info(f"Convertido webp->png: {png_path}")
                return png_path
            return image_path
        except Exception as e:
            logger.warning(f"Falha ao converter imagem: {e} — usando original")
            return image_path

    def _choose_voice(self, text):
        for v in VOICES:
            if any(name in v.lower() for name in ["antonio", "francisco", "donato"]):
                return v
        return FALLBACK_VOICE

    async def _generate_audio(self, text, output_path):
        voice = self._choose_voice(text)
        logger.info(f"Gerando audio TTS: voz={voice}, texto={len(text)} chars")
        communicate = edge_tts.Communicate(text, voice, rate="+10%", pitch="-5Hz")
        await communicate.save(output_path)
        logger.info(f"Audio gerado: {output_path} ({os.path.getsize(output_path)} bytes)")
        return output_path

    def _upload_file(self, file_path):
        logger.info(f"Upload: {file_path}")
        try:
            url = fal_client.upload_file(file_path)
            logger.info(f"Upload OK: {url[:80]}...")
            return url
        except Exception as e:
            logger.error(f"Upload FALHOU: {type(e).__name__}: {e}")
            return None

    def _call_sadtalker(self, image_url, audio_url):
        logger.info("Chamando SadTalker...")
        try:
            result = fal_client.subscribe(
                "fal-ai/sadtalker",
                arguments={
                    "source_image_url": image_url,
                    "driven_audio_url": audio_url,
                    "still_mode": True,
                    "preprocess": "full",
                },
                with_logs=True,
            )
            logger.info(f"SadTalker resultado: {list(result.keys()) if isinstance(result, dict) else type(result)}")
            video_info = result.get("video", {})
            url = video_info.get("url")
            if url:
                logger.info(f"Video URL obtido: {url[:80]}...")
            else:
                logger.warning(f"Sem URL de video. Chaves: {list(result.keys())}")
            return url
        except Exception as e:
            logger.error(f"SadTalker FALHOU: {type(e).__name__}: {e}")
            return None

    def _download_video(self, video_url):
        import requests
        logger.info(f"Baixando video: {video_url[:80]}...")
        response = requests.get(video_url, timeout=120)
        logger.info(f"Download status: {response.status_code}, tamanho: {len(response.content)} bytes")
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

            logger.info("=== ETAPA 1: Gerar audio TTS ===")
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self._generate_audio(text, audio_path))
            loop.close()

            if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 100:
                logger.error("Audio gerado esta vazio ou muito pequeno")
                self._cleanup(audio_path)
                return None, None

            logger.info("=== ETAPA 2: Upload audio para fal.ai ===")
            audio_url = self._upload_file(audio_path)
            if not audio_url:
                self._cleanup(audio_path)
                return None, None

            logger.info("=== ETAPA 3: Upload imagem para fal.ai ===")
            image_url = self._upload_file(self._png_path)
            if not image_url:
                self._cleanup(audio_path)
                return None, None

            logger.info("=== ETAPA 4: Gerar video SadTalker ===")
            video_url = self._call_sadtalker(image_url, audio_url)

            if not video_url:
                logger.warning("SadTalker falhou — retornando apenas audio")
                return audio_path, None

            logger.info("=== ETAPA 5: Baixar video ===")
            video_path = self._download_video(video_url)

            if not video_path:
                logger.warning("Download falhou — retornando apenas audio")
                return audio_path, None

            logger.info("=== PIPELINE COMPLETO COM SUCESSO ===")
            self._cleanup(audio_path)
            return None, video_path

        except Exception as e:
            logger.error(f"Erro geral no speak: {type(e).__name__}: {e}")
            self._cleanup(audio_path)
            self._cleanup(video_path)
            return None, None

    def _cleanup(self, path):
        if path and os.path.exists(path):
            try:
                os.unlink(path)
            except Exception:
                pass
