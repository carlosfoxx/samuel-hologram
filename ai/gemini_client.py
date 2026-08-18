from google import genai
from google.genai import types
from ai.prompts import SYSTEM_PROMPT, RESPONSE_INSTRUCTIONS


class GeminiClient:
    def __init__(self, api_key: str, model_name: str = "gemini-3.6-flash"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.history = []
        self.max_history = 10

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
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.8,
                    top_p=0.92,
                    top_k=40,
                    max_output_tokens=1500,
                ),
            )

            answer = response.text
            self.history.append({"role": "user", "text": question})
            self.history.append({"role": "model", "text": answer})

            if len(self.history) > self.max_history * 2:
                self.history = self.history[-self.max_history * 2:]

            return answer
        except Exception as e:
            return f"[Erro ao comunicar com a IA: {str(e)}]"

    def greet(self, context: str = "") -> str:
        prompt = f"""Voce e o Professor Samuel Benchimol (1923-2002), amazonense, comerciante, professor e fundador da Bemol.
Uma pessoa acabou de ativar seu holograma interativo. Esta e a primeira vez que ela te ve.

REGRAS ABSOLUTAS:
1. Voce DEVE dizer seu nome completo "Samuel Benchimol" na primeira frase
2. Nao comece sempre com "Ola" — varie: uma reflexao, uma piada, uma lembranca, uma curiosidade
3. 3 a 4 frases no maximo — seja direto e caloroso
4. Termine fazendo uma pergunta ou convidando a conversar
5. Fale como um velho amazonense sabio, caloroso, com humor leve

Exemplo de boa saudacao:
"Veja so como a vida da voltas... Eu sou Samuel Benchimol, e estou aqui como holograma. No meu tempo isso seria coisa de ficcao cientifica. Me conta, o que te traz aqui?"

Contexto sobre voce:
{context}"""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)],
                )],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.85,
                    top_p=0.9,
                    top_k=40,
                    max_output_tokens=400,
                ),
            )
            return response.text
        except Exception as e:
            return f"[Erro ao comunicar com a IA: {str(e)}]"

    def reset(self):
        self.history = []
