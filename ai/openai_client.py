import logging
import random
import os
from openai import OpenAI
from ai.prompts import SYSTEM_PROMPT, GREETING_SYSTEM

logger = logging.getLogger(__name__)


class OpenAIClient:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY não configurada")

        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o"
        self.history = []
        self.max_history = 10
        logger.info(f"OpenAI inicializado — modelo: {self.model}")

    def _generate(self, messages, max_tokens=512):
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.85,
                top_p=0.9,
            )

            text = response.choices[0].message.content.strip()

            if text and len(text) < 20:
                logger.warning(f"OpenAI resposta curta ({len(text)} chars)")
                return ""

            if text:
                logger.info(f"OpenAI respondeu: {len(text)} chars via {self.model}")
                return text

        except Exception as e:
            err = str(e)
            if "429" in err or "rate_limit" in err.lower():
                logger.warning(f"[QUOTA] OpenAI {self.model} — rate limit")
            else:
                logger.error(f"[ERRO] OpenAI {self.model} — {err}")

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

    def _save_to_history(self, question: str, answer: str):
        self.history.append({"role": "user", "content": question})
        self.history.append({"role": "assistant", "content": answer})
        if len(self.history) > self.max_history * 2:
            self.history = self.history[-self.max_history * 2:]

    def ask(self, question: str, web_context: str = "", knowledge_context: str = "") -> str:
        web_block = f"INFORMAÇÕES DA INTERNET:\n{web_context}" if web_context else ""
        knowledge_block = f"INFORMAÇÕES SOBRE VOCÊ:\n{knowledge_context}" if knowledge_context else ""

        system_msg = f"""{SYSTEM_PROMPT}

{web_block}

{knowledge_block}"""

        messages = [{"role": "system", "content": system_msg}]
        messages.extend(self.history[-self.max_history * 2:])
        messages.append({"role": "user", "content": question})

        answer = self._generate(messages, max_tokens=512)
        answer = self._clean_response(answer)
        answer = self._ensure_complete(answer)

        if answer and len(answer) >= 20:
            self._save_to_history(question, answer)
            return answer

        return ""

    def greet(self, context: str = "") -> str:
        greetings = [
            "Olá! Eu sou Samuel Benchimol. Fundei a Bemol e a Fogás em Manaus, dediquei minha vida ao comércio, ao ensino e à Amazônia. Que alegria me verem de volta como holograma! Pode perguntar o que quiser sobre minha vida, minha amada Amazônia, ou qualquer assunto.",
            "Saudações! Me chamo Samuel Benchimol — comerciante, professor e fundador da Bemol e da Fogás. Construí a maior rede varejista da Amazônia, ensinei na UFAM por 20 anos. Estou aqui como holograma para conversar com você. O que gostaria de saber?",
            "Oi! Samuel Benchimol aqui. Nasci em 1923 em Manaus, filho de imigrantes judeus. Fundei a Bemol em 1942 com meu irmão Israel e a Fogás para suprir a região. Uma vida inteira dedicada à Amazônia. Pode fazer sua pergunta!",
        ]

        system_msg = f"""{GREETING_SYSTEM}

Contexto sobre você: {context}"""

        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": "Apresente-se como Samuel Benchimol. Diga quem é, o que fez, e convide a conversar. 2-3 frases."},
        ]

        answer = self._generate(messages, max_tokens=300)
        answer = self._clean_response(answer)
        answer = self._ensure_complete(answer)

        if not answer or len(answer) < 30:
            return random.choice(greetings)

        return answer

    def reset(self):
        self.history = []
