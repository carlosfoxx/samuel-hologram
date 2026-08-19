import os
import logging
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from ai.gemini_client import GeminiClient
from ai.groq_client import GroqClient
from ai.openai_client import OpenAIClient
from ai.prompts import GREETING_MESSAGE
from ai.tts_fal import FalClient
from ai.search import web_search
from knowledge.loader import KnowledgeLoader
import config

app = Flask(__name__)
app.secret_key = os.urandom(24)

knowledge = None
gemini = None
groq = None
openai_client = None
fal = None


def init():
    global knowledge, gemini, groq, openai_client, fal

    try:
        knowledge = KnowledgeLoader(config.KNOWLEDGE_PATH)
    except Exception as e:
        print(f"[Knowledge] Erro ao carregar base: {e}")

    if config.GEMINI_API_KEY:
        try:
            gemini = GeminiClient(
                api_key=config.GEMINI_API_KEY,
                models=config.GEMINI_MODELS,
            )
        except Exception as e:
            print(f"[AI] Erro ao inicializar Gemini: {e}")

    try:
        groq = GroqClient()
        logger.info("Groq API configurada")
    except Exception as e:
        logger.info(f"Groq API nao configurada: {e}")

    try:
        openai_client = OpenAIClient()
        logger.info("OpenAI API configurada")
    except Exception as e:
        logger.info(f"OpenAI API nao configurada: {e}")

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
        api_configured=gemini is not None or groq is not None or openai_client is not None,
    )


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Mensagem vazia"}), 400

    logger.info(f"Recebido: {message[:80]}")

    if message == "__greeting__":
        greeting_context = ""
        if knowledge:
            results = knowledge.search("samuel benchimol fundador bemol fogás manaus", top_k=5)
            greeting_context = knowledge.format_context(results)

        response = None

        if gemini:
            response = gemini.greet(greeting_context)
            logger.info(f"Gemini greet: {response[:80] if response else 'vazio'}")

        if not response and groq:
            response = groq.greet(greeting_context)
            logger.info(f"Groq greet: {response[:80] if response else 'vazio'}")

        if not response and openai_client:
            response = openai_client.greet(greeting_context)
            logger.info(f"OpenAI greet: {response[:80] if response else 'vazio'}")

        if not response or len(response.strip()) < 20:
            response = GREETING_MESSAGE

        logger.info(f"Greeting final: {response[:80]}")
        return jsonify({"response": response})

    logger.info(f"Buscando na internet: {message[:50]}...")
    web_context = web_search.search(message, max_results=3)

    knowledge_context = ""
    if knowledge:
        results = knowledge.search(message, top_k=10)
        knowledge_context = knowledge.format_context(results)

    response = None

    if gemini:
        response = gemini.ask(message, web_context=web_context, knowledge_context=knowledge_context)
        logger.info(f"Gemini respondeu: {len(response) if response else 0} chars")

    if not response and groq:
        response = groq.ask(message, web_context=web_context, knowledge_context=knowledge_context)
        logger.info(f"Groq respondeu: {len(response) if response else 0} chars")

    if not response and openai_client:
        response = openai_client.ask(message, web_context=web_context, knowledge_context=knowledge_context)
        logger.info(f"OpenAI respondeu: {len(response) if response else 0} chars")

    if not response:
        response = "Desculpe, estou com dificuldades técnicas no momento. Pode repetir sua pergunta?"

    logger.info(f"Resposta final: {response[:80]}")
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

    try:
        if video_path and os.path.exists(video_path):
            return send_file(video_path, mimetype="video/mp4", as_attachment=False)
        elif audio_path and os.path.exists(audio_path):
            return send_file(audio_path, mimetype="audio/mpeg", as_attachment=False)
        else:
            return jsonify({"error": "Falha ao gerar audio/video"}), 503
    except Exception as e:
        logger.error(f"Erro ao enviar arquivo: {e}")
        return jsonify({"error": "Falha ao enviar audio/video"}), 500


@app.route("/api/reset", methods=["POST"])
def reset():
    if gemini:
        gemini.reset()
    if groq:
        groq.history = []
    if openai_client:
        openai_client.reset()
    return jsonify({"status": "ok"})


@app.route("/media/<path:filename>")
def media(filename):
    return send_from_directory(config.MEDIA_PATH, filename)


if __name__ == "__main__":
    init()
    app.run(debug=True, host="0.0.0.0", port=5000)
else:
    init()
