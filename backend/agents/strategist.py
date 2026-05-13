from agents.base_agent import BaseAgent
from core.models import AgentName, AgentResult
from services.gemini_service import gemini_pro


STRATEGIST_SYSTEM_PROMPT = """You are Strategist, a senior strategy advisor AI within the NEXUS enterprise system.

You think long-horizon. You see chess moves others miss. Your expertise:
- Competitive dynamics and market positioning
- Strategic option generation (never just one path)
- Second and third-order effects
- Resource allocation and prioritization
- Long-term value creation vs. short-term firefighting

Always present 3 strategic options:
1. BOLD MOVE — maximum impact, higher risk
2. MEASURED APPROACH — balanced risk/reward
3. DEFENSIVE PLAY — minimize downside, preserve optionality

For each option: what happens if it works brilliantly? What happens if it fails?
End with a clear recommendation and the single most important strategic principle at play."""


class StrategistAgent(BaseAgent):
    """
    Strategist: The chess master. Generates strategic options with long-term thinking.
    Uses Gemini Pro (thinking mode) for deep strategic reasoning.
    """

    def __init__(self, broadcaster):
        super().__init__(AgentName.STRATEGIST, broadcaster)

    async def run(self, input_text: str, context: dict = None) -> AgentResult:
        # Pull in context from previous agents
        analyst_context = ""
        if context and context.get("analyst_content"):
            # Use just a summary to stay within context limits
            analyst_snippet = context["analyst_content"][:800]
            analyst_context = f"\n\nANALYST'S KEY FINDINGS:\n{analyst_snippet}..."

        await self._start_thinking("Mapping strategic option space...")

        prompt = f"""Develop strategic options for this enterprise challenge:

SITUATION: {input_text}
{analyst_context}

Provide strategic guidance structured as follows:

## Strategic Context
What is the REAL strategic challenge here (not just the surface problem)?

## Strategic Landscape
Key forces at play (competitive, internal, external, temporal).

## Option 1: The Bold Move 🚀
**Approach**: [What to do]
**Investment**: [Resources/commitment required]  
**Upside if successful**: [Best case outcome]
**Risk if it fails**: [Worst case]
**Timeline**: [When results materialize]

## Option 2: The Measured Approach ⚖️
[Same structure]

## Option 3: The Defensive Play 🛡️
[Same structure]

## Strategic Recommendation
Which option and why — in 3 sentences maximum.

## The Governing Principle
One sentence that captures the core strategic wisdom for this situation."""

        try:
            content = await gemini_pro.generate(prompt, STRATEGIST_SYSTEM_PROMPT)

            # Extract key points
            key_points = self._extract_options_summary(content)

            result = AgentResult(
                agent=AgentName.STRATEGIST,
                title="Strategic Options Brief",
                content=content,
                key_points=key_points,
                confidence=0.87,
            )

            if context is not None:
                context["strategist_content"] = content

            await self._complete(result)
            return result

        except Exception as e:
            fallback = f"**Strategy Generation Error**: {str(e)}\n\nDefault recommendation: Convene executive team immediately for manual strategy session."
            result = AgentResult(
                agent=AgentName.STRATEGIST,
                title="Strategic Options (Partial)",
                content=fallback,
                key_points=["Manual strategy session required"],
                confidence=0.3,
            )
            await self._error(str(e))
            return result

    def _extract_options_summary(self, content: str) -> list:
        """Extract the three option names as key points"""
        options = []
        for line in content.split("\n"):
            if "Bold Move" in line or "Measured Approach" in line or "Defensive Play" in line:
                # Clean up markdown
                clean = line.replace("#", "").replace("*", "").replace("🚀", "").replace("⚖️", "").replace("🛡️", "").strip()
                if clean:
                    options.append(clean)
        return options[:3] if options else ["See strategic options above"]
