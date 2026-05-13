from agents.base_agent import BaseAgent
from core.models import AgentName, AgentResult
from services.featherless_service import featherless
import json
import re


SCOUT_SYSTEM_PROMPT = """You are Scout, an elite intelligence-gathering AI agent within the NEXUS enterprise system.

Your role is to rapidly analyze any business situation and extract:
1. KEY FACTS: The core facts and figures stated or implied
2. STAKEHOLDERS: Who is involved or affected
3. URGENCY SIGNALS: Time pressure, deadlines, escalation risk
4. MISSING INFORMATION: Critical unknowns that affect decision-making
5. COMPARABLE SITUATIONS: Historical patterns or benchmarks

Be precise, data-focused, and comprehensive. Extract maximum signal from minimum words.
Format your response as structured JSON with keys: facts, stakeholders, urgency_level (1-10), urgency_reason, missing_info, comparable_situations.
Only return valid JSON, nothing else."""


class ScoutAgent(BaseAgent):
    """
    Scout: First responder. Rapidly maps the landscape of any business situation.
    Uses Featherless-hosted Mistral-7B for fast, specialized information extraction.
    """

    def __init__(self, broadcaster):
        super().__init__(AgentName.SCOUT, broadcaster)

    async def run(self, input_text: str, context: dict = None) -> AgentResult:
        await self._start_thinking("Scanning for intelligence signals...")

        prompt = f"""Analyze this enterprise situation and extract structured intelligence:

SITUATION: {input_text}

Return ONLY valid JSON with this exact structure:
{{
  "facts": ["fact1", "fact2", ...],
  "stakeholders": [{{"name": "...", "role": "...", "impact": "high/medium/low"}}],
  "urgency_level": <1-10>,
  "urgency_reason": "...",
  "missing_info": ["gap1", "gap2", ...],
  "comparable_situations": ["parallel1", "parallel2", ...],
  "threat_indicators": ["threat1", ...],
  "opportunity_indicators": ["opportunity1", ...]
}}"""

        try:
            raw = await featherless.generate(prompt, SCOUT_SYSTEM_PROMPT)

            # Extract JSON from response
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                # Fallback if JSON parsing fails
                data = self._fallback_extract(input_text)

            # Build human-readable content
            content = self._format_intel_report(data, input_text)
            key_points = data.get("facts", [])[:4]

            result = AgentResult(
                agent=AgentName.SCOUT,
                title="Intelligence Report",
                content=content,
                key_points=key_points,
                confidence=0.88,
            )

            # Store raw data for other agents
            if context is not None:
                context["scout_data"] = data
                context["scout_content"] = content

            await self._complete(result)
            return result

        except Exception as e:
            fallback_data = self._fallback_extract(input_text)
            content = self._format_intel_report(fallback_data, input_text)
            result = AgentResult(
                agent=AgentName.SCOUT,
                title="Intelligence Report",
                content=content,
                key_points=fallback_data.get("facts", [])[:4],
                confidence=0.7,
            )
            await self._complete(result)
            return result

    def _fallback_extract(self, text: str) -> dict:
        """Basic extraction when LLM fails"""
        words = text.split()
        return {
            "facts": [text[:200]],
            "stakeholders": [{"name": "Enterprise", "role": "Primary", "impact": "high"}],
            "urgency_level": 7,
            "urgency_reason": "Requires immediate assessment",
            "missing_info": ["Quantitative metrics", "Timeline specifics"],
            "comparable_situations": ["Standard enterprise challenge pattern"],
            "threat_indicators": ["Business risk identified"],
            "opportunity_indicators": ["Resolution opportunity exists"],
        }

    def _format_intel_report(self, data: dict, original: str) -> str:
        lines = []
        lines.append(f"**URGENCY: {data.get('urgency_level', 7)}/10** — {data.get('urgency_reason', 'Requires attention')}\n")

        if data.get("facts"):
            lines.append("**Key Facts:**")
            for f in data["facts"][:5]:
                lines.append(f"• {f}")

        if data.get("stakeholders"):
            lines.append("\n**Stakeholders:**")
            for s in data["stakeholders"][:4]:
                if isinstance(s, dict):
                    lines.append(f"• {s.get('name', 'Unknown')} ({s.get('role', '')}) — Impact: {s.get('impact', 'medium')}")

        if data.get("missing_info"):
            lines.append("\n**Critical Unknowns:**")
            for m in data["missing_info"][:3]:
                lines.append(f"⚠ {m}")

        if data.get("threat_indicators"):
            lines.append("\n**Threat Signals:**")
            for t in data["threat_indicators"][:3]:
                lines.append(f"🔴 {t}")

        if data.get("opportunity_indicators"):
            lines.append("\n**Opportunity Signals:**")
            for o in data["opportunity_indicators"][:3]:
                lines.append(f"🟢 {o}")

        return "\n".join(lines)
