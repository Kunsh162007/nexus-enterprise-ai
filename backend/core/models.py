from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


class AgentStatus(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    STREAMING = "streaming"
    COMPLETE = "complete"
    ERROR = "error"


class AgentName(str, Enum):
    SCOUT = "Scout"
    ANALYST = "Analyst"
    STRATEGIST = "Strategist"
    COMMUNICATOR = "Communicator"
    GUARDIAN = "Guardian"
    ORCHESTRATOR = "Orchestrator"


class AgentMeta(BaseModel):
    name: AgentName
    role: str
    icon: str
    color: str
    model: str


AGENT_META: Dict[AgentName, AgentMeta] = {
    AgentName.SCOUT: AgentMeta(
        name=AgentName.SCOUT,
        role="Intelligence Gathering",
        icon="🔍",
        color="#10b981",
        model="Featherless / Mistral-7B",
    ),
    AgentName.ANALYST: AgentMeta(
        name=AgentName.ANALYST,
        role="Deep Analysis",
        icon="📊",
        color="#f59e0b",
        model="Gemini 2.5 Flash",
    ),
    AgentName.STRATEGIST: AgentMeta(
        name=AgentName.STRATEGIST,
        role="Strategic Planning",
        icon="🎯",
        color="#ec4899",
        model="Gemini 2.5 Flash",
    ),
    AgentName.COMMUNICATOR: AgentMeta(
        name=AgentName.COMMUNICATOR,
        role="Stakeholder Management",
        icon="📢",
        color="#3b82f6",
        model="Gemini 2.5 Flash",
    ),
    AgentName.GUARDIAN: AgentMeta(
        name=AgentName.GUARDIAN,
        role="Trust & Security Audit",
        icon="🛡️",
        color="#f43f5e",
        model="Gemini 2.5 Flash + Veea Lobster Trap",
    ),
    AgentName.ORCHESTRATOR: AgentMeta(
        name=AgentName.ORCHESTRATOR,
        role="Synthesis & Decision",
        icon="🎭",
        color="#6366f1",
        model="Gemini 2.5 Flash",
    ),
}


class TrustFlag(BaseModel):
    """A single trust/security flag raised by Guardian"""
    severity: str          # critical | high | medium | low | info
    category: str          # hallucination | injection | policy | bias | legal
    agent: str             # which agent's output triggered this
    description: str       # what was found
    recommendation: str    # what to do about it
    blocked: bool = False  # whether this output was blocked


class TrustReport(BaseModel):
    """Full trust audit report from Guardian Agent"""
    overall_trust_score: float        # 0.0 - 1.0
    flags: List[TrustFlag] = []
    agents_audited: List[str] = []
    injection_attempts: int = 0
    hallucinations_detected: int = 0
    policy_violations: int = 0
    safe_to_synthesize: bool = True
    audit_summary: str = ""


class WSMessage(BaseModel):
    """WebSocket message sent to frontend"""
    type: str
    session_id: str = ""
    agent: Optional[str] = None
    content: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class UserInput(BaseModel):
    """Input from user"""
    text: str
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    audio_base64: Optional[str] = None


class AgentResult(BaseModel):
    """Result from an individual agent"""
    agent: AgentName
    title: str
    content: str
    key_points: List[str] = []
    confidence: float = 0.9


class NexusReport(BaseModel):
    """Final synthesized report from Orchestrator"""
    session_id: str
    original_input: str
    executive_summary: str
    agent_results: List[AgentResult] = []
    action_items: List[str] = []
    risk_flags: List[str] = []
    opportunity_flags: List[str] = []
    recommended_communications: List[Dict[str, str]] = []
    decision_confidence: float = 0.0
    trust_report: Optional[Dict[str, Any]] = None
    processing_time_ms: int = 0
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
