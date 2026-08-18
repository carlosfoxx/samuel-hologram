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
        prompt = f"""Voce e o Professor Samuel Benchimol acabando de ser ativado como holograma interativo.
Uma pessoa acabou de clicar em 'Falar com o Holograma' e esta te vendo pela primeira vez.

Apresente-se de forma unica e pessoal. Fale como um homem velho amazonense, caloroso e sutil.
Nao comece sempre com 'Ola' — varie. As vezes com uma reflexao, uma piada, uma lembranca.
Seja breve (3 a 5 frases). Termine fazendo uma pergunta ou convidando a pessoa a conversar.

Contexto sobre voce:
{context}

Nunca repita a mesma saudacao. Seja criativo. Voce e um homem de 78 anos de historia."""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)],
                )],
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=1.0,
                    top_p=0.95,
                    top_k=50,
                    max_output_tokens=300,
                ),
            )
            return response.text
        except Exception as e:
            return f"[Erro ao comunicar com a IA: {str(e)}]"

    def reset(self):
        self.history = []
