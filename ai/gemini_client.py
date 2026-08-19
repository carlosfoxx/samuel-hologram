import logging
import random
import re
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


SAMUEL_PERSONALITY = [
    "Olha, ",
    "Deixe-me te contar uma coisa. ",
    "Sabe o que eu penso? ",
    "Essa e uma boa pergunta. ",
    "Vou te explicar como eu vi a coisa. ",
    "Essa e uma historia que eu gosto de contar. ",
    "Na minha epoca, ",
    "Eu sempre disse isso para meus alunos: ",
    "Deixe-me pensar um pouco... ",
    "Ah, ",
    "Veja bem, ",
    "Sabe o que acontece? ",
    "Posso te contar. ",
    "Uma coisa que aprendi na vida: ",
    "Eu sempre acreditei nisso: ",
]

SAMUEL_CLOSERS = [
    " E isso, na minha epoca, fazia toda a diferenca.",
    " Isso e algo que sempre defendi.",
    " E foi assim que construi tudo que conquistei.",
    " Essa e a verdade que eu sempre ensinei.",
    " E olha onde chegamos.",
    " Isso resume tudo o que eu acredito.",
    " E foi isso que me fez chegar ate aqui.",
    " Essa e a lição mais importante que tenho para dar.",
    " E isso vale para qualquer epoca da vida.",
    " Isso e o que eu sempre disse para quem quis ouvir.",
]


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
            logger.info(f"[Tentativa {attempt+1}/{len(self.models)}] Modelo: {self.model_name}")
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

                text = self._clean_response(text)

                truncated = False
                if response.candidates:
                    fr = str(response.candidates[0].finish_reason) if response.candidates[0].finish_reason else ""
                    if "MAX_TOKENS" in fr:
                        truncated = True
                        logger.warning(f"Resposta truncada (MAX_TOKENS) em {self.model_name}")

                if text and len(text) < 30:
                    logger.warning(f"Resposta muito curta ({len(text)} chars): '{text}' — tratando como falha")
                    text = ""

                if text:
                    logger.info(f"Resposta obtida de {self.model_name}: {len(text)} chars")
                else:
                    logger.warning(f"Resposta vazia de {self.model_name}")

                return text, truncated

            except Exception as e:
                err = str(e)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    logger.warning(f"[QUOTA] {self.model_name} - quota esgotada (429)")
                    self._rotate_model()
                    continue
                elif "404" in err or "NOT_FOUND" in err:
                    logger.warning(f"[NOT_FOUND] {self.model_name} - modelo nao existe (404)")
                    self._rotate_model()
                    continue
                else:
                    logger.error(f"[ERRO] {self.model_name} - {err}")
                    raise

        logger.warning("Todos os modelos falharam.")
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

    def _format_as_samuel(self, text):
        if not text:
            return text

        text = text.strip()

        text = text.replace("Fogas", "Fogás")
        text = text.replace("Amazonia", "Amazônia")
        text = text.replace("nao ", "não ")
        text = text.replace("tambem", "também")
        text = text.replace("alem ", "além ")
        text = text.replace("ate ", "até ")
        text = text.replace(" so ", " só ")
        text = text.replace(" ja ", " já ")
        text = text.replace(" voce", " você")
        text = text.replace("entao", "então")
        text = text.replace("heranca", "herança")
        text = text.replace("Comecava", "Começava")
        text = text.replace("comecava", "começava")
        text = text.replace("negocios", "negócios")
        text = text.replace("negocio", "negócio")
        text = text.replace("decada", "década")
        text = text.replace("crianca", "criança")
        text = text.replace("familia", "família")
        text = text.replace("irmao", "irmão")
        text = text.replace("epoca", "época")
        text = text.replace("politica", "política")
        text = text.replace("comercio", "comércio")
        text = text.replace("formacao", "formação")
        text = text.replace("migracao", "migração")
        text = text.replace("associacao", "associação")
        text = text.replace("integracao", "integração")
        text = text.replace("economico", "econômico")
        text = text.replace("ecologico", "ecológico")
        text = text.replace("justica", "justiça")
        text = text.replace("publicas", "públicas")
        text = text.replace("estrategias", "estratégias")
        text = text.replace("educacao", "educação")
        text = text.replace("saude", "saúde")
        text = text.replace("historia", "história")
        text = text.replace("maquinas", "máquinas")
        text = text.replace("importacao", "importação")
        text = text.replace("reputacao", "reputação")
        text = text.replace("lideranca", "liderança")
        text = text.replace("principios", "princípios")
        text = text.replace("presenca", "presença")
        text = text.replace("occipacao", "ocupação")
        text = text.replace("colonizacao", "colonização")
        text = text.replace("esperanca", "esperança")
        text = text.replace("preservacao", "preservação")
        text = text.replace("conhecimento", "conhecimento")

        text = text.replace("e uma ", "é uma ")
        text = text.replace("e o ", "é o ")
        text = text.replace("e a ", "é a ")
        text = text.replace("e isso", "é isso")
        text = text.replace("e como", "é como")
        text = text.replace("e verdade", "é verdade")
        text = text.replace("nao e ", "não é ")

        if not text[0].isupper():
            text = text[0].upper() + text[1:]

        return text

    def _fallback_from_context(self, context: str, question: str) -> str:
        lines = [l.strip() for l in context.split("\n") if l.strip() and len(l.strip()) > 20]
        lines = [re.sub(r'^\[\d+\]\s*\([^)]*\)\s*', '', l) for l in lines]
        lines = [l for l in lines if l and len(l) > 10]
        if not lines:
            return None

        question_words = set(question.lower().replace("?", "").replace("!", "").replace(",", "").split())
        question_words = {w for w in question_words if len(w) > 2}

        scored = []
        for line in lines:
            line_words = set(line.lower().replace("?", "").replace("!", "").replace(",", "").split())
            score = len(question_words & line_words)
            scored.append((score, line))

        scored.sort(key=lambda x: x[0], reverse=True)

        best_lines = [l for s, l in scored[:3] if s > 0]
        if not best_lines:
            best_lines = [l for _, l in scored[:2]]

        if not best_lines:
            return None

        main_text = best_lines[0]
        main_text = main_text.replace("**", "").replace("- ", "")

        if len(main_text) > 250:
            main_text = main_text[:250].rsplit(" ", 1)[0] + "."

        main_text = self._format_as_samuel(main_text)

        prefix = random.choice(SAMUEL_PERSONALITY)

        closer = ""
        if len(best_lines) > 1 and random.random() > 0.5:
            extra = best_lines[1].replace("**", "").replace("- ", "")
            extra = self._format_as_samuel(extra)
            if len(extra) > 100:
                extra = extra[:100].rsplit(" ", 1)[0] + "."
            closer = " " + extra

        return prefix + main_text + closer

    def ask(self, question: str, context: str = "") -> str:
        if context:
            logger.info("Gerando resposta da base de conhecimento")
            answer = self._fallback_from_context(context, question)
            if answer:
                logger.info(f"Resposta da base: {len(answer)} chars")
                self.history.append({"role": "user", "text": question})
                self.history.append({"role": "model", "text": answer})
                if len(self.history) > self.max_history * 2:
                    self.history = self.history[-self.max_history * 2:]
                return answer

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
        answer = self._ensure_complete(answer)

        if not answer:
            import random as rnd
            fallback_msgs = [
                "Desculpe, estou com dificuldades técnicas no momento. Pode repetir sua pergunta?",
                "Não consegui processar bem sua pergunta. Pode tentar de novo?",
                "Minha conexão está instável agora. Pode reformular?",
            ]
            return rnd.choice(fallback_msgs)

        self.history.append({"role": "user", "text": question})
        self.history.append({"role": "model", "text": answer})

        if len(self.history) > self.max_history * 2:
            self.history = self.history[-self.max_history * 2:]

        return answer

    def greet(self, context: str = "") -> str:
        import random as rnd

        greetings = [
            "Olá! Eu sou Samuel Benchimol, fundador da Bemol e da Fogás. Que alegria me verem de volta como holograma! Pode perguntar o que quiser sobre minha vida e minha amada Amazônia.",
            "Saudações! Me chamo Samuel Benchimol — comerciante, professor e fundador da Bemol e da Fogás. Estou aqui como holograma para conversar com você. O que gostaria de saber?",
            "Oi! Samuel Benchimol aqui. Fundei a Bemol e a Fogás, dediquei minha vida à Amazônia. Agora estou como holograma, pronto para conversar. Pode fazer sua pergunta!",
            "Olá! Eu sou o Professor Samuel Benchimol. Fundei a Bemol e a Fogás em Manaus. Uma vida inteira dedicada ao comércio, ao ensino e à Amazônia. Pode perguntar o que quiser — estou aqui para conversar.",
            "Saudações! Samuel Benchimol aqui. Velho comerciante, professor e fundador da Bemol e da Fogás. Que alegria estar de volta! Pode me perguntar sobre minha vida, a Amazônia, ou qualquer coisa.",
        ]

        prompt = f"""Apresente-se como Samuel Benchimol. Diga seu nome e que fundou a Bemol e a Fogás. 2 frases. Convide a conversar.

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

        if not answer or len(answer) < 30:
            return rnd.choice(greetings)

        return answer

    def reset(self):
        self.history = []
