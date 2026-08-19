import logging
from google import genai
from google.genai import types
from ai.prompts import SYSTEM_PROMPT, RESPONSE_INSTRUCTIONS

logger = logging.getLogger(__name__)

GREETING_SYSTEM = """Voce e o Professor Samuel Benchimol (1923-2002), amazonense, comerciante, professor e fundador da Bemol e da Fogas em Manaus.
Voce acaba de ser ativado como holograma interativo por uma pessoa.

REGRAS OBRIGATORIAS:
1. Voce DEVE dizer seu nome completo "Samuel Benchimol" na primeira frase
2. Voce DEVE mencionar que fundou a Bemol e a Fogas
3. Seja caloroso, humano, com humor leve
4. 2 a 3 frases no maximo
5. Termine convidando a conversar"""


class GeminiClient:
    def __init__(self, api_key: str, models: list):
        self.api_key = api_key
        self.models = models
        self.current_model = 0
        self.history = []
        self.max_history = 10
        self._init_client()

    def _init_client(self):
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = self.models[self.current_model]
        logger.info(f"Modelo ativo: {self.model_name}")

    def _rotate_model(self):
        self.current_model = (self.current_model + 1) % len(self.models)
        self.model_name = self.models[self.current_model]
        logger.info(f"Rotacionando para: {self.model_name}")
        self._init_client()

    def _generate(self, contents, config):
        for attempt in range(len(self.models)):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=contents,
                    config=config,
                )

                text = ""
                if response.text and response.text.strip():
                    text = response.text.strip()
                elif response.candidates:
                    for candidate in response.candidates:
                        if candidate.content and candidate.content.parts:
                            for part in candidate.content.parts:
                                if part.text and part.text.strip():
                                    text = part.text.strip()
                                    break
                        if text:
                            break

                truncated = False
                if response.candidates:
                    fr = str(response.candidates[0].finish_reason) if response.candidates[0].finish_reason else ""
                    if "MAX_TOKENS" in fr:
                        truncated = True

                return text, truncated

            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    logger.warning(f"Quota esgotada: {self.model_name}")
                    self._rotate_model()
                    continue
                elif "404" in err or "NOT_FOUND" in err:
                    logger.warning(f"Modelo nao encontrado: {self.model_name}")
                    self._rotate_model()
                    continue
                else:
                    raise

        return "", False

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

    def _ensure_complete(self, text):
        if not text:
            return text
        text = text.rstrip()
        if text.endswith((".", "!", "?", "...")):
            return text
        last_period = max(text.rfind("."), text.rfind("!"), text.rfind("?"))
        if last_period > len(text) // 2:
            return text[:last_period + 1]
        if len(text) > 10:
            return text + "."
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

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.8,
            top_p=0.92,
            top_k=40,
            max_output_tokens=150,
        )

        answer, truncated = self._generate(contents, config)

        answer = self._clean_response(answer)
        answer = self._ensure_complete(answer)

        if not answer and context:
            answer = self._fallback_from_context(context, question)

        if not answer:
            return "Desculpe, nao consegui processar. Pode repetir?"

        self.history.append({"role": "user", "text": question})
        self.history.append({"role": "model", "text": answer})

        if len(self.history) > self.max_history * 2:
            self.history = self.history[-self.max_history * 2:]

        return answer

    def _fallback_from_context(self, context: str, question: str) -> str:
        import re
        lines = [l.strip() for l in context.split("\n") if l.strip() and len(l.strip()) > 20]
        lines = [re.sub(r'^\[\d+\]\s*\([^)]*\)\s*', '', l) for l in lines]
        lines = [l for l in lines if l and len(l) > 10]
        if not lines:
            return None

        question_words = set(question.lower().split())
        best = None
        best_score = 0

        for line in lines:
            line_words = set(line.lower().split())
            score = len(question_words & line_words)
            if score > best_score:
                best_score = score
                best = line

        if best:
            text = best.replace("**", "").replace("- ", "")
            if len(text) > 200:
                text = text[:200].rsplit(" ", 1)[0] + "."
            return text

        fallback = lines[0].replace("**", "").replace("- ", "")
        if len(fallback) > 200:
            fallback = fallback[:200].rsplit(" ", 1)[0] + "."
        return fallback

    def greet(self, context: str = "") -> str:
        prompt = f"""Apresente-se como Samuel Benchimol. Diga seu nome e que fundou a Bemol e a Fogas. 2 frases. Convide a conversar.

Contexto: {context}"""

        config = types.GenerateContentConfig(
            system_instruction=GREETING_SYSTEM,
            temperature=0.85,
            top_p=0.9,
            top_k=40,
            max_output_tokens=150,
        )

        contents = [types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        )]

        answer, truncated = self._generate(contents, config)

        answer = self._clean_response(answer)
        answer = self._ensure_complete(answer)

        if not answer or len(answer) < 20:
            return "Ola! Eu sou Samuel Benchimol, fundador da Bemol e da Fogas. Obrigado por me trazer de volta como holograma. Pode perguntar o que quiser."

        return answer

    def reset(self):
        self.history = []
