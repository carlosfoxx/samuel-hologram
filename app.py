import os
import logging
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from ai.gemini_client import GeminiClient
from ai.prompts import GREETING_MESSAGE
from ai.tts_fal import FalClient
from knowledge.loader import KnowledgeLoader
import config

app = Flask(__name__)
app.secret_key = os.urandom(24)

knowledge = None
gemini = None
fal = None


def init():
    global knowledge, gemini, fal

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

    fal_key = os.getenv("FAL_API_KEY", "")
    image_path = os.path.join(os.path.dirname(__file__), "media", "samuel-benchimol.webp")
    if fal_key and os.path.exists(image_path):
        fal = FalClient(fal_key, image_path)
        logger.info("fal.ai API configurada")
    else:
        logger.info("fal.ai API nao configurada (FAL_API_KEY ausente)")


@app.route("/favicon.ico")
def favicon():
    return send_from_directory("static", "favicon.ico", mimetype="image/x-icon")


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

    logger.info(f"Recebido: {message[:80]}")

    if message == "__greeting__":
        context = ""
        if knowledge:
            results = knowledge.search("apresentacao samuel benchimol vida", top_k=5)
            context = knowledge.format_context(results)

        if gemini:
            response = gemini.greet(context)
        else:
            response = GREETING_MESSAGE

        if not response or len(response.strip()) < 20:
            response = GREETING_MESSAGE

        logger.info(f"Greeting: {response[:80]}")
        return jsonify({"response": response})

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

    logger.info(f"Resposta: {response[:80]}")
    return jsonify({"response": response})


@app.route("/api/speak", methods=["POST"])
def speak():
    data = request.get_json()
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "Texto vazio"}), 400

    if not fal:
        return jsonify({"error": "fal.ai API nao configurada"}), 503

    logger.info(f"Speak: {text[:60]}...")

    audio_path, video_path = fal.speak(text)

    if video_path:
        logger.info(f"Video gerado")
        return send_file(video_path, mimetype="video/mp4", as_attachment=False)
    elif audio_path:
        logger.info("Video falhou, retornando audio")
        return send_file(audio_path, mimetype="audio/mpeg", as_attachment=False)
    else:
        return jsonify({"error": "Falha ao gerar audio/video"}), 500


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
