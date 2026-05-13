import asyncio
from typing import Callable, Dict, List, Any
from core.models import AgentName


class MessageBus:
    """
    Async publish-subscribe message bus for inter-agent communication.
    Agents publish their findings; the Orchestrator subscribes to all.
    """

    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
        self._shared_context: Dict[str, Any] = {}
        self._lock = asyncio.Lock()

    async def publish(self, topic: str, message: Any):
        """Publish a message to a topic"""
        async with self._lock:
            # Store in shared context for late subscribers
            self._shared_context[topic] = message

        handlers = self._subscribers.get(topic, [])
        await asyncio.gather(*[handler(message) for handler in handlers])

    def subscribe(self, topic: str, handler: Callable):
        """Subscribe to a topic"""
        if topic not in self._subscribers:
            self._subscribers[topic] = []
        self._subscribers[topic].append(handler)

    async def get_context(self, topic: str) -> Any:
        """Get latest published message for a topic"""
        return self._shared_context.get(topic)

    async def get_all_agent_results(self) -> Dict[str, Any]:
        """Get results from all agents"""
        return {
            k: v for k, v in self._shared_context.items()
            if k.startswith("agent_result:")
        }

    def clear(self):
        self._subscribers.clear()
        self._shared_context.clear()
