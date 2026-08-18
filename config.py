import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

WINDOW_TITLE = "Prof. Samuel Benchimol - Holograma"
WINDOW_WIDTH = 1200
WINDOW_HEIGHT = 800

HOLOGRAM_PRIMARY_COLOR = (0, 200, 255)
HOLOGRAM_GLOW_COLOR = (0, 150, 255, 80)
HOLOGRAM_BG_COLOR = (5, 5, 15)

TTS_ENABLED = os.getenv("TTS_ENABLED", "true").lower() == "true"
TTS_LANG = "pt-br"
TTS_SLOW = False

KNOWLEDGE_PATH = os.path.join(os.path.dirname(__file__), "knowledge", "benchimol.json")
MEDIA_PATH = os.path.join(os.path.dirname(__file__), "media")
