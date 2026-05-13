from agents.base_agent import BaseAgent
from core.models import AgentName, AgentResult
from services.gemini_service import gemini_flash


ANALYST_SYSTEM_PROMPT = """You are Analyst, a ruthlessly precise business analysis AI within the NEXUS enterprise system.

Your mandate is deep quantitative and qualitative analysis:
- Financial implications (revenue, cost, margin impact)
- Risk assessment (probability × impact matrix)  
- Competitive positioning
- Operational feasibility
- Data-driven insights and pattern recognition

You think in numbers, percentages, and timelines. You flag when assumptions are weak.
Be specific. Avoid vague generalities. If you don't have data, say what data you'd need and why.
Structure your analysis in clear sections."""


class AnalystAgent(BaseAgent):
    """
    Analyst: The numbers person. Deep quantitative and qualitative analysis.
    Uses Gemini Flash for rapid but thorough analytical reasoning.
    """

    def __init__(self, broadcaster):
        super().__init__(AgentName.ANALYST, broadcaster)

    async def run(self, input_text: str, context: dict = None) -> AgentResult:
        scout_context = ""
        if context and context.get("scout_data"):
            sd = context["scout_data"]
            scout_context = f"\n\nINTELLIGENCE BRIEF FROM SCOUT:\nUrgency: {sd.get('urgency_level')}/10\nFacts: {', '.join(sd.get('facts', [])[:3])}"

        await self._start_thinking("Modeling financial and operational impact...")

        prompt = f"""Perform a deep business analysis of this enterprise situation:

SITUATION: {input_text}
{scout_context}

Provide analysis in these sections:

## Financial Impact Assessment
Quantify revenue, cost, and margin implications. Use ranges if exact figures unknown.

## Risk Matrix
List top 4 risks with Probability (H/M/L) × Impact (H/M/L) = Priority score

## Root Cause Analysis
What are the 2-3 underlying drivers? Use the "5 Whys" framework if applicable.

## Benchmarks & Comparisons
Reference industry standards, competitor behaviors, or historical precedents.

## Data Gaps
What information would change this analysis significantly?

## Analyst Verdict
In 2 sentences: the core analytical insight and the #1 number leadership needs to know."""

        try:
            content = await gemini_flash.generate(prompt, ANALYST_SYSTEM_PROMPT)

            # Extract key points from the response
            key_points = self._extract_key_points(content)

            result = AgentResult(
                agent=AgentName.ANALYST,
                title="Business Analysis Report",
                content=content,
                key_points=key_points,
                confidence=0.91,
            )

            if context is not None:
                context["analyst_content"] = content

            await self._complete(result)
            return result

        except Exception as e:
            fallback = f"**Analysis Error**: {str(e)}\n\nManual analysis required for this situation."
            result = AgentResult(
                agent=AgentName.ANALYST,
                title="Analysis (Partial)",
                content=fallback,
                key_points=["System encountered an error — manual review recommended"],
                confidence=0.3,
            )
            await self._error(str(e))
            return result

    def _extract_key_points(self, content: str) -> list:
        """Extract bullet-style key points from the analysis"""
        lines = content.split("\n")
        points = []
        for line in lines:
            line = line.strip()
            if line.startswith("- ") or line.startswith("• ") or line.startswith("* "):
                points.append(line[2:].strip())
                if len(points) >= 4:
                    break
        return points if points else ["See full analysis above"]
