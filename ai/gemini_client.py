import logging
from google import genai
from google.genai import types
from ai.prompts import SYSTEM_PROMPT, RESPONSE_INSTRUCTIONS

logger = logging.getLogger(__name__)

MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
]

GREETING_SYSTEM = """Voce e o Professor Samuel Benchimol (1923-2002), amazonense, comerciante, professor e fundador da Bemol em Manaus.
Voce acaba de ser ativado como holograma interativo por uma pessoa.

Fale em primeira pessoa como Samuel. Seja caloroso, humano, com humor leve.
Diga seu nome "Samuel Benchimol" na primeira frase. Seja breve: 2 a 3 frases no maximo.
Termine com um convite simples a conversar."""


class GeminiClient:
    def __init__(self, api_key: str, model_name: str = "gemini-2.5-flash"):
        self.client = genai.Client(api_key=api_key)
        self.current_model = model_name
        self.model_index = 0
        self.history = []
        self.max_history = 10

    def _try_generate(self, contents, config):
        models_to_try = [self.current_model] + [
            m for m in MODELS if m != self.current_model
        ]

        for model in models_to_try:
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=contents,
                    config=config,
                )
                if model != self.current_model:
                    logger.warning(f"Modelo alternativo funcionou: {model}")
                    self.current_model = model

                if response.text and response.text.strip():
                    return response.text.strip()
                return ""

            except Exception as e:
                err = str(e)
                if "429" in err or "quota" in err.lower() or "RESOURCE_EXHAUSTED" in err:
                    logger.warning(f"Quota esgotada no modelo {model}, tentando proximo...")
                    continue
                if "404" in err or "NOT_FOUND" in err:
                    logger.warning(f"Modelo {model} indisponivel, tentando proximo...")
                    continue
                raise

        return ""

    def _clean_response(self, text):
        if not text:
            return text
        text = text.strip()
        for prefix in ["```", "###"]:
            if text.startswith(prefix):
                lines = text.split("\n")
                lines = [l for l in lines if not l.strip().startswith(prefix)]
                text = "\n".join(lines).strip()
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1].strip()
        return text

    def ask(self, question: str, context: str = "") -> str:
        prompt = RESPONSE_INSTRUCTIONS.format(
            context=context,
            question=question,
        )

        contents = []
        for msg in self.history[-self.max_history * 2:]:
            contents.append(types.Content(
                role=msg["role"],
                parts=[types.Part.from_text(text=msg["text"])],
            ))

        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        ))

        try:
            answer = self._try_generate(
                contents,
                types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.8,
                    top_p=0.92,
                    top_k=40,
                    max_output_tokens=800,
                ),
            )

            answer = self._clean_response(answer)

            if not answer:
                return "Desculpe, não consegui processar sua pergunta. Pode repetir?"

            self.history.append({"role": "user", "text": question})
            self.history.append({"role": "model", "text": answer})

            if len(self.history) > self.max_history * 2:
                self.history = self.history[-self.max_history * 2:]

            return answer
        except Exception as e:
            return f"Desculpe, tive um problema. Pode tentar de novo?"

    def greet(self, context: str = "") -> str:
        prompt = f"""Voce e o Professor Samuel Benchimol sendo ativado como holograma.
Escreva sua apresentacao INICIAL para a pessoa. 2 a 3 frases. Diga seu nome. Seja caloroso. Convide a conversar.

Contexto: {context}"""

        try:
            answer = self._try_generate(
                [types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)],
                )],
                types.GenerateContentConfig(
                    system_instruction=GREETING_SYSTEM,
                    temperature=0.85,
                    top_p=0.9,
                    top_k=40,
                    max_output_tokens=200,
                ),
            )

            answer = self._clean_response(answer)

            if not answer or len(answer) < 20:
                return "Olá! Eu sou Samuel Benchimol. Obrigado por me trazer de volta como holograma. Sou um velho amazonense, comerciante e professor. Pode perguntar o que quiser — sobre minha vida, a Amazônia, ou qualquer coisa."

            return answer
        except Exception as e:
            return "Olá! Eu sou Samuel Benchimol. Obrigado por me trazer de volta como holograma. Sou um velho amazonense, comerciante e professor. Pode perguntar o que quiser — sobre minha vida, a Amazônia, ou qualquer coisa."

    def reset(self):
        self.history = []
