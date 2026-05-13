from agents.base_agent import BaseAgent
from core.models import AgentName, AgentResult
from services.gemini_service import gemini_flash


COMMUNICATOR_SYSTEM_PROMPT = """You are Communicator, a chief communications strategist AI within the NEXUS enterprise system.

Your expertise:
- Stakeholder mapping and message tailoring
- Crisis communications and reputation management
- Internal alignment and change management messaging
- External communications (clients, press, investors, regulators)
- Narrative control and framing

Every stakeholder group needs a different message. The same facts told differently
can save a relationship or destroy it.

You produce ready-to-send communication drafts — not templates, actual draft messages.
Each draft should be: appropriately toned for the audience, action-oriented, and honest without being damaging."""


class CommunicatorAgent(BaseAgent):
    """
    Communicator: The voice of the enterprise. Crafts targeted stakeholder communications.
    Uses Gemini Flash for fast, high-quality natural language generation.
    """

    def __init__(self, broadcaster):
        super().__init__(AgentName.COMMUNICATOR, broadcaster)

    async def run(self, input_text: str, context: dict = None) -> AgentResult:
        # Get stakeholder data from Scout
        stakeholders = []
        if context and context.get("scout_data"):
            stakeholders = context["scout_data"].get("stakeholders", [])

        await self._start_thinking("Mapping stakeholder communications...")

        stakeholder_list = ""
        if stakeholders:
            sh_names = [s.get("name", "Unknown") if isinstance(s, dict) else str(s) for s in stakeholders[:4]]
            stakeholder_list = f"\n\nIDENTIFIED STAKEHOLDERS: {', '.join(sh_names)}"

        prompt = f"""Create a comprehensive stakeholder communication plan for:

SITUATION: {input_text}
{stakeholder_list}

Produce the following communications:

## Stakeholder Map
List affected audiences with their primary concern and emotional state.

## Internal Communication: Leadership Team
Subject line + 150-word email/message draft.
Tone: Transparent, action-oriented, confidence-building.

## Internal Communication: Affected Employees  
Subject line + 120-word message draft.
Tone: Empathetic, clear about next steps, honest about uncertainty.

## External Communication: Key Clients/Partners
Subject line + 150-word draft.
Tone: Professional, reassuring, value-preserving.

## Crisis Statement (if applicable)
60-word public-facing statement draft.
Tone: Responsible, forward-looking.

## Messaging DON'Ts
Three specific things NOT to say in any communication about this situation (and why)."""

        try:
            content = await gemini_flash.generate(prompt, COMMUNICATOR_SYSTEM_PROMPT)

            # Parse communication drafts as structured data
            comms = self._extract_comms(content)

            result = AgentResult(
                agent=AgentName.COMMUNICATOR,
                title="Stakeholder Communication Plan",
                content=content,
                key_points=[
                    "Leadership team communication drafted",
                    "Employee messaging prepared",
                    "Client communication ready",
                    "Crisis statement available",
                ],
                confidence=0.93,
            )

            if context is not None:
                context["communicator_content"] = content
                context["comms_drafts"] = comms

            await self._complete(result)
            return result

        except Exception as e:
            fallback = f"**Communication Planning Error**: {str(e)}\n\nEscalate to PR/Communications team immediately."
            result = AgentResult(
                agent=AgentName.COMMUNICATOR,
                title="Communications (Partial)",
                content=fallback,
                key_points=["Escalate to communications team"],
                confidence=0.3,
            )
            await self._error(str(e))
            return result

    def _extract_comms(self, content: str) -> list:
        """Extract individual communication drafts"""
        comms = []
        sections = ["Leadership Team", "Affected Employees", "Key Clients", "Crisis Statement"]
        for section in sections:
            if section in content:
                start = content.index(section)
                end = content.find("##", start + 1)
                snippet = content[start:end if end > start else start + 300].strip()
                comms.append({"audience": section, "draft": snippet[:300]})
        return comms
