import os
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
from dotenv import load_dotenv

load_dotenv()

from ai.gemini_client import GeminiClient
from ai.prompts import GREETING_MESSAGE
from ai.tts_engine import TTSEngine
from knowledge.loader import KnowledgeLoader
import config

app = Flask(__name__)
app.secret_key = os.urandom(24)

knowledge = None
gemini = None
tts = None


def init():
    global knowledge, gemini, tts

    try:
        knowledge = KnowledgeLoader(config.KNOWLEDGE_PATH)
    except Exception as e:
        print(f"[Knowledge] Erro ao carregar base: {e}")

    if config.GEMINI_API_KEY:
        try:
            gemini = GeminiClient(
                api_key=config.GEMINI_API_KEY,
                model_name=config.GEMINI_MODEL,
            )
        except Exception as e:
            print(f"[AI] Erro ao inicializar Gemini: {e}")

    try:
        tts = TTSEngine()
        print("[TTS] Edge TTS inicializado com voz pt-BR-AntonioNeural")
    except Exception as e:
        print(f"[TTS] Erro ao inicializar Edge TTS: {e}")


@app.route("/")
def index():
    return render_template(
        "index.html",
        greeting=GREETING_MESSAGE,
        api_configured=gemini is not None,
    )


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Mensagem vazia"}), 400

    context = ""
    if knowledge:
        results = knowledge.search(message, top_k=8)
        context = knowledge.format_context(results)

    if gemini:
        response = gemini.ask(message, context)
    else:
        response = (
            "Desculpe, a IA nao esta configurada no momento. "
            "Por favor, configure a GEMINI_API_KEY."
        )

    audio_id = None
    if tts:
        try:
            audio_id, _ = tts.generate(response)
            tts.cleanup()
        except Exception as e:
            print(f"[TTS] Erro ao gerar audio: {e}")

    return jsonify({"response": response, "audio_id": audio_id})


@app.route("/api/audio/<audio_id>")
def serve_audio(audio_id):
    if not tts:
        return jsonify({"error": "TTS nao configurado"}), 500

    path = tts.get_audio_path(audio_id)
    if path:
        return send_file(path, mimetype="audio/mpeg")
    return jsonify({"error": "Audio nao encontrado"}), 404


@app.route("/api/reset", methods=["POST"])
def reset():
    if gemini:
        gemini.reset()
    return jsonify({"status": "ok"})


@app.route("/media/<path:filename>")
def media(filename):
    return send_from_directory(config.MEDIA_PATH, filename)


if __name__ == "__main__":
    init()
    app.run(debug=True, host="0.0.0.0", port=5000)
else:
    init()
