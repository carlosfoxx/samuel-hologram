import google.generativeai as genai
from ai.prompts import SYSTEM_PROMPT, RESPONSE_INSTRUCTIONS


class GeminiClient:
    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash"):
        genai.configure(api_key=api_key)

        generation_config = genai.types.GenerationConfig(
            temperature=0.7,
            top_p=0.9,
            top_k=40,
            max_output_tokens=2048,
        )

        self.model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=SYSTEM_PROMPT,
            generation_config=generation_config,
        )

        self.chat = self.model.start_chat(history=[])

    def ask(self, question: str, context: str = "") -> str:
        prompt = RESPONSE_INSTRUCTIONS.format(
            context=context,
            question=question,
        )

        try:
            response = self.chat.send_message(prompt)
            return response.text
        except Exception as e:
            return f"[Erro ao comunicar com a IA: {str(e)}]"

    def reset(self):
        self.chat = self.model.start_chat(history=[])
