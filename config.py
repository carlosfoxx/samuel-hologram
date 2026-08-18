import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-latest")

KNOWLEDGE_PATH = os.path.join(os.path.dirname(__file__), "knowledge", "benchimol.json")
MEDIA_PATH = os.path.join(os.path.dirname(__file__), "media")
