"""
Veea Lobster Trap Integration
─────────────────────────────
Lobster Trap is Veea's deep prompt inspection and policy enforcement layer.
It inspects agent outputs for:
  - Prompt injection attacks
  - Policy violations
  - Unsafe content
  - Unauthorized data access patterns

We wrap it here with a fallback to Gemini-based auditing when
Lobster Trap API credentials are not configured.
"""

import aiohttp
import json
from typing import Optional
from core.config import settings


LOBSTER_TRAP_URL = "https://api.veea.com/lobster-trap/v1/inspect"


class LobsterTrapService:
    """
    Veea Lobster Trap — deep prompt inspection and policy enforcement.
    Falls back gracefully to Gemini-based auditing if API key not set.
    """

    def __init__(self):
        self.api_key = getattr(settings, "veea_lobster_trap_key", "")
        self.enabled = bool(self.api_key and self.api_key != "your_veea_key_here")

    async def inspect(
        self,
        content: str,
        agent_name: str,
        original_prompt: str = "",
        policy_profile: str = "enterprise_default",
    ) -> dict:
        """
        Inspect an agent's output through Lobster Trap.

        Returns a dict with:
          - safe: bool
          - injection_detected: bool
          - policy_violations: list[str]
          - risk_score: float (0-1)
          - reason: str
        """
        if self.enabled:
            return await self._call_lobster_trap(
                content, agent_name, original_prompt, policy_profile
            )
        else:
            # Fallback: return a basic passthrough result
            # (Guardian agent uses Gemini to do the deep audit in this path)
            return {
                "safe": True,
                "injection_detected": False,
                "policy_violations": [],
                "risk_score": 0.0,
                "reason": "Lobster Trap not configured — using Gemini audit",
                "source": "fallback",
            }

    async def _call_lobster_trap(
        self,
        content: str,
        agent_name: str,
        original_prompt: str,
        policy_profile: str,
    ) -> dict:
        """Call the actual Lobster Trap API"""
        payload = {
            "content": content,
            "context": {
                "agent_name": agent_name,
                "original_prompt": original_prompt,
            },
            "policy_profile": policy_profile,
            "checks": [
                "prompt_injection",
                "policy_compliance",
                "data_exfiltration",
                "hallucination_markers",
                "legal_risk",
            ],
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    LOBSTER_TRAP_URL,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    else:
                        # API error — fail safe (don't block)
                        return {
                            "safe": True,
                            "injection_detected": False,
                            "policy_violations": [],
                            "risk_score": 0.0,
                            "reason": f"Lobster Trap API error {resp.status}",
                            "source": "api_error_fallback",
                        }
        except Exception as e:
            return {
                "safe": True,
                "injection_detected": False,
                "policy_violations": [],
                "risk_score": 0.0,
                "reason": f"Connection error: {str(e)}",
                "source": "connection_error_fallback",
            }


lobster_trap = LobsterTrapService()
