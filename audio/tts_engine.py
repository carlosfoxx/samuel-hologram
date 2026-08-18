import threading
from gtts import gTTS
import tempfile
import os

try:
    import pygame
    pygame.mixer.init()
    PYGAME_AVAILABLE = True
except Exception:
    PYGAME_AVAILABLE = False


class TTSEngine:
    def __init__(self, lang: str = "pt-br", slow: bool = False):
        self.lang = lang
        self.slow = slow
        self.enabled = True
        self._playing = False

    def speak(self, text: str, callback=None):
        if not self.enabled or not text.strip():
            return

        thread = threading.Thread(
            target=self._speak_thread,
            args=(text, callback),
            daemon=True,
        )
        thread.start()

    def _speak_thread(self, text: str, callback=None):
        try:
            self._playing = True
            tts = gTTS(text=text, lang=self.lang, slow=self.slow)

            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
                tmp_path = f.name
                tts.write_to_fp(f)

            if PYGAME_AVAILABLE:
                pygame.mixer.music.load(tmp_path)
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy():
                    pygame.time.wait(100)
            else:
                os.system(f'start "" "{tmp_path}"')

            self._playing = False

            try:
                os.unlink(tmp_path)
            except OSError:
                pass

            if callback:
                callback()
        except Exception as e:
            self._playing = False
            print(f"[TTS Error] {e}")

    def stop(self):
        if PYGAME_AVAILABLE and pygame.mixer.music.get_busy():
            pygame.mixer.music.stop()
        self._playing = False

    def toggle(self) -> bool:
        self.enabled = not self.enabled
        if not self.enabled:
            self.stop()
        return self.enabled

    @property
    def is_playing(self) -> bool:
        return self._playing
