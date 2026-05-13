import google.generativeai as genai
from core.config import settings
from typing import AsyncGenerator, Optional
import asyncio


genai.configure(api_key=settings.gemini_api_key)


class GeminiService:
    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.gemini_flash_model
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=2048,
            ),
        )

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Generate a response from Gemini"""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        # Run in thread pool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.model.generate_content(full_prompt)
        )
        return response.text

    async def stream_generate(self, prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
        """Stream a response from Gemini chunk by chunk"""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        loop = asyncio.get_event_loop()

        # Get streaming response in executor
        response = await loop.run_in_executor(
            None,
            lambda: self.model.generate_content(full_prompt, stream=True)
        )

        for chunk in response:
            if chunk.text:
                yield chunk.text
                await asyncio.sleep(0)  # yield control


# Singletons
gemini_flash = GeminiService(settings.gemini_flash_model)
gemini_pro = GeminiService(settings.gemini_pro_model)
