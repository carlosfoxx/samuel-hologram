from google import genai
from google.genai import types
from ai.prompts import SYSTEM_PROMPT, RESPONSE_INSTRUCTIONS


class GeminiClient:
    FALLBACK_MODELS = [
        "gemini-3.6-flash",
        "gemini-2.5-flash",
        "gemini-2.0-flash-001",
        "gemini-1.5-flash",
    ]

    def __init__(self, api_key: str, model_name: str = "gemini-3.6-flash"):
        self.client = genai.Client(api_key=api_key)
        self.history = []
        self.max_history = 10
        self.model_name = None

        for model in self.FALLBACK_MODELS:
            try:
                self.client.models.generate_content(
                    model=model,
                    contents="Teste",
                    config=types.GenerateContentConfig(max_output_tokens=5),
                )
                self.model_name = model
                print(f"[Gemini] Modelo ativo: {model}")
                break
            except Exception as e:
                err = str(e)
                if "400" in err or "404" in err or "not found" in err.lower():
                    print(f"[Gemini] Modelo {model} indisponivel, tentando proximo...")
                    continue
                self.model_name = model
                break

        if not self.model_name:
            self.model_name = "gemini-2.5-flash"
            print(f"[Gemini] Nenhum modelo confirmado, usando {self.model_name}")

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

    def reset(self):
        self.history = []
