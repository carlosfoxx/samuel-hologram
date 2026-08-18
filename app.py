import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv

load_dotenv()

from ai.gemini_client import GeminiClient
from ai.prompts import GREETING_MESSAGE
from knowledge.loader import KnowledgeLoader
import config

app = Flask(__name__)
app.secret_key = os.urandom(24)

knowledge = None
gemini = None


def init():
    global knowledge, gemini

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

    if message == "__greeting__":
        context = ""
        if knowledge:
            results = knowledge.search("apresentacao samuel benchimol vida", top_k=5)
            context = knowledge.format_context(results)

        if gemini:
            response = gemini.greet(context)
        else:
            response = GREETING_MESSAGE
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

    return jsonify({"response": response})


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
