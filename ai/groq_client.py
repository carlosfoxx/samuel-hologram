import logging
import random
import os
from groq import Groq
from ai.prompts import SYSTEM_PROMPT, GREETING_SYSTEM, GREETING_MESSAGE, RESPONSE_INSTRUCTIONS

logger = logging.getLogger(__name__)

SAMUEL_PERSONALITY = [
    "Olha, ",
    "Deixe-me te contar uma coisa. ",
    "Sabe o que eu penso? ",
    "Essa é uma boa pergunta. ",
    "Veja bem, ",
    "Na minha época, ",
    "Sabe o que acontece? ",
]

SAMUEL_CLOSERS = [
    " E isso, na minha época, fazia toda a diferença.",
    " Isso é algo que sempre defendi.",
    " E foi assim que construí tudo que conquistei.",
]


class GroqClient:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY não configurada")

        self.client = Groq(api_key=api_key)
        self.models = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "meta-llama/llama-4-scout-17b-16e-instruct",
        ]
        self.current_model = 0
        self.model_name = self.models[0]
        self.history = []
        self.max_history = 10
        logger.info(f"Groq inicializado — modelo: {self.model_name}")

    def _rotate_model(self):
        self.current_model = (self.current_model + 1) % len(self.models)
        self.model_name = self.models[self.current_model]
        logger.info(f"Groq rotacionando para: {self.model_name}")

    def _generate(self, messages, max_tokens=512):
        for attempt in range(len(self.models)):
            try:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=0.85,
                    top_p=0.9,
                )

                text = response.choices[0].message.content.strip()

                if text and len(text) < 20:
                    logger.warning(f"Groq resposta curta ({len(text)} chars)")
                    text = ""

                if text:
                    logger.info(f"Groq respondeu: {len(text)} chars via {self.model_name}")
                    return text

            except Exception as e:
                err = str(e)
                if "429" in err or "rate_limit" in err.lower():
                    logger.warning(f"[QUOTA] Groq {self.model_name} — rate limit")
                    self._rotate_model()
                    continue
                else:
                    logger.error(f"[ERRO] Groq {self.model_name} — {err}")
                    self._rotate_model()
                    continue

        logger.warning("Todos os modelos Groq falharam.")
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

    def _format_as_samuel(self, text):
        if not text:
            return text
        text = text.replace("**", "")
        text = text.replace("- ", "")
        text = text.replace("\n\n", " ")
        text = text.replace("\n", " ")
        text = text.strip()

        text = text.replace("nao ", "não ")
        text = text.replace("tambem ", "também ")
        text = text.replace("alem ", "além ")
        text = text.replace(" ate ", " até ")
        text = text.replace(" voce", " você")
        text = text.replace(" so ", " só ")
        text = text.replace(" ja ", " já ")
        text = text.replace("tao ", "tão ")
        text = text.replace("heranca", "herança")
        text = text.replace("decada", "década")
        text = text.replace("crianca", "criança")
        text = text.replace("familia", "família")
        text = text.replace("irmao", "irmão")
        text = text.replace("epoca", "época")
        text = text.replace("politica", "política")
        text = text.replace("comercio", "comércio")
        text = text.replace("formacao", "formação")
        text = text.replace("economico", "econômico")
        text = text.replace("ecologico", "ecológico")
        text = text.replace("educacao", "educação")
        text = text.replace("historia", "história")
        text = text.replace("lideranca", "liderança")
        text = text.replace("principios", "princípios")
        text = text.replace("presenca", "presença")
        text = text.replace("esperanca", "esperança")
        text = text.replace("preservacao", "preservação")
        text = text.replace("confirmacao", "confirmação")
        text = text.replace("titulo", "título")
        text = text.replace("operacao", "operação")
        text = text.replace("contribuicao", "contribuição")
        text = text.replace("iniciacao", "iniciação")
        text = text.replace("academica", "acadêmica")
        text = text.replace("amazonicas", "amazônicas")
        text = text.replace("dificil", "difícil")
        text = text.replace("Fogas", "Fogás")
        text = text.replace("fogas", "fogás")
        text = text.replace("Amazonia", "Amazônia")
        text = text.replace("amazonia", "amazônia")
        text = text.replace("e uma ", "é uma ")
        text = text.replace("e o ", "é o ")
        text = text.replace("e a ", "é a ")
        text = text.replace("e isso", "é isso")
        text = text.replace("e como", "é como")
        text = text.replace("e verdade", "é verdade")
        text = text.replace("nao e ", "não é ")

        if text and not text[0].isupper():
            text = text[0].upper() + text[1:]

        return text

    def _save_to_history(self, question: str, answer: str):
        self.history.append({"role": "user", "content": question})
        self.history.append({"role": "assistant", "content": answer})
        if len(self.history) > self.max_history * 2:
            self.history = self.history[-self.max_history * 2:]

    def ask(self, question: str, context: str = "") -> str:
        system_msg = f"""{SYSTEM_PROMPT}

INFORMAÇÕES SOBRE VOCÊ (use quando relevante):
{context}"""

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
