import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODELS = os.getenv("GEMINI_MODELS", "gemini-3.6-flash,gemini-2.5-flash,gemini-2.0-flash").split(",")
GEMINI_MODEL = GEMINI_MODELS[0]

KNOWLEDGE_PATH = os.path.join(os.path.dirname(__file__), "knowledge", "benchimol.json")
MEDIA_PATH = os.path.join(os.path.dirname(__file__), "media")
