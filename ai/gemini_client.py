import logging
import time
from google import genai
from google.genai import types
from ai.prompts import SYSTEM_PROMPT, RESPONSE_INSTRUCTIONS

logger = logging.getLogger(__name__)

GREETING_SYSTEM = """Voce e o Professor Samuel Benchimol (1923-2002), amazonense, comerciante, professor e fundador da Bemol e da Fogás em Manaus.
Voce acaba de ser ativado como holograma interativo por uma pessoa.

REGRAS OBRIGATORIAS:
1. Voce DEVE dizer seu nome completo "Samuel Benchimol" na primeira frase
2. Voce DEVE mencionar que fundou a Bemol e a Fogás
3. Seja caloroso, humano, com humor leve
4. 2 a 3 frases no maximo
5. Termine convidando a conversar"""


class GeminiClient:
    def __init__(self, api_key: str, model_name: str = "gemini-3.6-flash"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.history = []
        self.max_history = 10

    def _extract_text(self, response):
        if response.text and response.text.strip():
            return response.text.strip()

        if response.candidates:
            for candidate in response.candidates:
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if part.text and part.text.strip():
                            return part.text.strip()

        return ""

    def _generate(self, contents, config, retries=2):
        for attempt in range(retries + 1):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=contents,
                    config=config,
                )

                text = self._extract_text(response)

                truncated = False
                if response.candidates:
                    fr = response.candidates[0].finish_reason
                    fr_str = str(fr) if fr else ""
                    if "MAX_TOKENS" in fr_str:
                        truncated = True
                        logger.warning("Resposta truncada por MAX_TOKENS")

                    if not text:
                        logger.warning(
                            f"Resposta vazia. finish_reason={fr_str}, "
                            f"candidates={len(response.candidates)}"
                        )

                if text:
                    return text, truncated

                if attempt < retries:
                    logger.info(f"Tentativa {attempt+1} vazia, retry em 1s...")
                    time.sleep(1)
                    continue

                return "", truncated

            except Exception as e:
                err = str(e)
                if "429" in err or "quota" in err.lower() or "RESOURCE_EXHAUSTED" in err:
                    logger.warning(f"Quota esgotada: {err[:150]}")
                    return "", False
                if attempt < retries:
                    logger.info(f"Erro na tentativa {attempt+1}: {err[:100]}, retry...")
                    time.sleep(1)
                    continue
                raise

        return "", False

    def _continue_response(self, partial_text, contents, config):
        continue_contents = list(contents)
        continue_contents.append(types.Content(
            role="model",
            parts=[types.Part.from_text(text=partial_text)],
        ))
        continue_contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text="Continue de onde parou.")],
        ))

        new_config = types.GenerateContentConfig(
            system_instruction=config.system_instruction,
            temperature=config.temperature,
            top_p=config.top_p,
            top_k=config.top_k,
            max_output_tokens=100,
        )

        text, _ = self._generate(continue_contents, new_config, retries=1)
        if text:
            return partial_text + " " + text
        return partial_text

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
        if text.endswith((".", "!", "?", "...")):
            return text
        if text.endswith((",", "\u2013", "-", "\u2014", " ")):
            text = text.rstrip(" ,\u2013-\u2014 ") + "."
        else:
            last_space = text.rfind(" ")
            if last_space > 0:
                text = text[:last_space] + "."
            else:
                text += "."
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

        try:
            answer, truncated = self._generate(contents, config)

            if truncated and answer:
                answer = self._continue_response(answer, contents, config)

            answer = self._clean_response(answer)
            answer = self._ensure_complete(answer)

            if not answer:
                logger.error("Resposta vazia apos todas as tentativas")
                return "Desculpe, nao consegui processar. Pode repetir?"

            self.history.append({"role": "user", "text": question})
            self.history.append({"role": "model", "text": answer})

            if len(self.history) > self.max_history * 2:
                self.history = self.history[-self.max_history * 2:]

            return answer
        except Exception as e:
            logger.error(f"Erro final: {e}")
            return "Desculpe, tive um problema. Pode tentar de novo?"

    def greet(self, context: str = "") -> str:
        prompt = f"""Voce e o Professor Samuel Benchimol sendo ativado como holograma.
Escreva sua apresentacao INICIAL para a pessoa. 2 a 3 frases. Diga seu nome. Seja caloroso. Convide a conversar.

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

        try:
            answer, truncated = self._generate(contents, config)

            if truncated and answer:
                answer = self._continue_response(answer, contents, config)

            answer = self._clean_response(answer)
            answer = self._ensure_complete(answer)

            if not answer or len(answer) < 20:
                return "Ola! Eu sou Samuel Benchimol. Obrigado por me trazer de volta como holograma. Sou um velho amazonense, comerciante e professor. Pode perguntar o que quiser."

            return answer
        except Exception as e:
            logger.error(f"Erro no greet: {e}")
            return "Ola! Eu sou Samuel Benchimol. Obrigado por me trazer de volta como holograma. Sou um velho amazonense, comerciante e professor. Pode perguntar o que quiser."

    def reset(self):
        self.history = []
