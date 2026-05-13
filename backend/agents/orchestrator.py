from agents.base_agent import BaseAgent
from core.models import AgentName, AgentResult, NexusReport
from services.gemini_service import gemini_pro
import json
import time


ORCHESTRATOR_SYSTEM_PROMPT = """You are the Orchestrator, the commanding intelligence of the NEXUS enterprise system.

You have received intelligence from four specialized agents:
- Scout: Facts, stakeholders, and intelligence landscape
- Analyst: Financial impact, risks, and data analysis
- Strategist: Strategic options and long-horizon thinking  
- Communicator: Stakeholder communications plan

Your role: Synthesize all inputs into a definitive executive action brief.

You don't add analysis — you integrate, prioritize, and make the call.
Be decisive. Leaders need clarity, not more options.
Your output is what goes to the CEO's desk at 7 AM tomorrow.

Format your synthesis as a structured executive brief."""


class OrchestratorAgent(BaseAgent):
    """
    Orchestrator: The conductor. Synthesizes all agent outputs into one definitive brief.
    Uses Gemini Pro for sophisticated integration and decision synthesis.
    """

    def __init__(self, broadcaster):
        super().__init__(AgentName.ORCHESTRATOR, broadcaster)

    async def run(self, input_text: str, context: dict = None) -> AgentResult:
        await self._start_thinking("Synthesizing all agent intelligence...")

        # Build context summary from all agents
        ctx_parts = []
        if context:
            if context.get("scout_data"):
                sd = context["scout_data"]
                ctx_parts.append(f"SCOUT INTEL:\nUrgency: {sd.get('urgency_level')}/10\nFacts: {'; '.join(sd.get('facts', [])[:3])}\nThreats: {'; '.join(sd.get('threat_indicators', [])[:2])}")

            if context.get("analyst_content"):
                ctx_parts.append(f"ANALYST REPORT:\n{context['analyst_content'][:600]}...")

            if context.get("strategist_content"):
                ctx_parts.append(f"STRATEGIST BRIEF:\n{context['strategist_content'][:600]}...")

            if context.get("communicator_content"):
                ctx_parts.append(f"COMMUNICATIONS PLAN:\n{context['communicator_content'][:400]}...")

        context_block = "\n\n---\n\n".join(ctx_parts) if ctx_parts else "Limited agent data available."

        prompt = f"""ORIGINAL SITUATION:
{input_text}

AGENT INTELLIGENCE RECEIVED:
{context_block}

Synthesize into an executive action brief:

## NEXUS EXECUTIVE BRIEF

### Executive Summary (4 sentences max)
The situation, the stakes, the recommendation, and the deadline.

### Decisive Recommendation
ONE clear path forward. No hedging. State it as an instruction.

### Immediate Actions (Next 48 Hours)
Numbered list of exactly 5 concrete actions with owners and deadlines.

### Risk Alerts 🔴
Top 3 risks that could derail the recommended path.

### Opportunity Flags 🟢  
Top 2 opportunities hidden within this challenge.

### 30-Day Success Metric
One measurable outcome that proves the response is working.

### Decision Confidence
Rate your confidence in this recommendation: X/10 with brief rationale."""

        try:
            content = await gemini_pro.generate(prompt, ORCHESTRATOR_SYSTEM_PROMPT)

            # Extract structured data from the report
            action_items = self._extract_action_items(content)
            risk_flags = self._extract_section(content, "Risk Alerts")
            opportunity_flags = self._extract_section(content, "Opportunity Flags")
            confidence = self._extract_confidence(content)
            exec_summary = self._extract_executive_summary(content)

            result = AgentResult(
                agent=AgentName.ORCHESTRATOR,
                title="NEXUS Executive Brief",
                content=content,
                key_points=action_items[:4],
                confidence=confidence,
            )

            # Build the full report
            if context is not None:
                from core.models import AgentResult as AR
                context["final_report"] = {
                    "executive_summary": exec_summary,
                    "full_brief": content,
                    "action_items": action_items,
                    "risk_flags": risk_flags,
                    "opportunity_flags": opportunity_flags,
                    "decision_confidence": confidence,
                }

            await self._complete(result)
            return result

        except Exception as e:
            fallback = f"**Orchestration Error**: {str(e)}\n\nConvene emergency leadership meeting. NEXUS encountered an integration failure."
            result = AgentResult(
                agent=AgentName.ORCHESTRATOR,
                title="Executive Brief (Failed)",
                content=fallback,
                key_points=["System error — manual synthesis required"],
                confidence=0.0,
            )
            await self._error(str(e))
            return result

    def _extract_action_items(self, content: str) -> list:
        items = []
        in_section = False
        for line in content.split("\n"):
            if "Immediate Actions" in line:
                in_section = True
                continue
            if in_section and line.strip().startswith(("#", "##")):
                break
            if in_section:
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith("-")):
                    clean = line.lstrip("0123456789.-) ").strip()
                    if clean:
                        items.append(clean)
        return items[:5] if items else ["Assess situation", "Brief leadership", "Define response", "Monitor outcomes", "Report progress"]

    def _extract_section(self, content: str, section_name: str) -> list:
        items = []
        in_section = False
        for line in content.split("\n"):
            if section_name in line:
                in_section = True
                continue
            if in_section and line.strip().startswith(("##", "###")):
                break
            if in_section:
                line = line.strip()
                if line and (line.startswith("-") or line.startswith("•") or line[0].isdigit()):
                    clean = line.lstrip("-•0123456789. ").strip()
                    if clean:
                        items.append(clean)
        return items[:3]

    def _extract_confidence(self, content: str) -> float:
        import re
        patterns = [r'(\d+(?:\.\d+)?)/10', r'confidence.*?(\d+(?:\.\d+)?)']
        for pattern in patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                val = float(match.group(1))
                if val <= 10:
                    return val / 10.0
        return 0.82

    def _extract_executive_summary(self, content: str) -> str:
        lines = content.split("\n")
        in_summary = False
        summary_lines = []
        for line in lines:
            if "Executive Summary" in line:
                in_summary = True
                continue
            if in_summary:
                if line.startswith("#"):
                    break
                if line.strip():
                    summary_lines.append(line.strip())
                if len(summary_lines) >= 4:
                    break
        return " ".join(summary_lines) if summary_lines else content[:300]
