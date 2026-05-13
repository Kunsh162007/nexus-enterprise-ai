from abc import ABC, abstractmethod
from typing import Callable, Optional
from core.models import AgentName, AgentResult, WSMessage, AGENT_META
import json


class BaseAgent(ABC):
    """Base class for all NEXUS agents"""

    def __init__(self, name: AgentName, broadcaster: Callable):
        self.name = name
        self.meta = AGENT_META[name]
        self.broadcaster = broadcaster
        self._thinking_buffer = []

    async def _broadcast(self, msg_type: str, content: str = "", data: dict = None):
        """Send a WebSocket message to the frontend"""
        msg = WSMessage(
            type=msg_type,
            agent=self.name.value,
            content=content,
            data=data or {},
        )
        await self.broadcaster(json.loads(msg.model_dump_json()))

    async def _start_thinking(self, thinking_preview: str = ""):
        await self._broadcast("agent_thinking", thinking_preview)

    async def _stream_chunk(self, chunk: str):
        await self._broadcast("agent_stream", chunk)

    async def _complete(self, result: AgentResult):
        await self._broadcast(
            "agent_complete",
            content=result.content,
            data={
                "title": result.title,
                "key_points": result.key_points,
                "confidence": result.confidence,
            }
        )

    async def _error(self, error_msg: str):
        await self._broadcast("agent_error", error_msg)

    @abstractmethod
    async def run(self, input_text: str, context: dict = None) -> AgentResult:
        """Execute the agent's analysis"""
        pass
