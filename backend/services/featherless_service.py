from openai import AsyncOpenAI
from core.config import settings
from typing import AsyncGenerator


class FeatherlessService:
    """
    Featherless provides 27,000+ open-source models via an OpenAI-compatible API.
    We use Mistral-7B as the Scout agent for fast information extraction.
    """

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.featherless_api_key,
            base_url=settings.featherless_base_url,
        )
        self.model = settings.featherless_scout_model

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Generate a response from Featherless-hosted model"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=1024,
            temperature=0.4,
        )
        return response.choices[0].message.content

    async def stream_generate(self, prompt: str, system_prompt: str = "") -> AsyncGenerator[str, None]:
        """Stream response from Featherless"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=1024,
            temperature=0.4,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


featherless = FeatherlessService()
