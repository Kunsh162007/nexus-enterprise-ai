import asyncio
import json
import time
import uuid
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.config import settings
from core.models import UserInput, NexusReport, AGENT_META, AgentName
from core.message_bus import MessageBus
from agents.scout import ScoutAgent
from agents.analyst import AnalystAgent
from agents.strategist import StrategistAgent
from agents.communicator import CommunicatorAgent
from agents.orchestrator import OrchestratorAgent
from agents.guardian import GuardianAgent
from services.speechmatics_service import speechmatics


# ─── App Setup ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="NEXUS Enterprise AI",
    description="Five specialized AI agents. One unified enterprise decision engine.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Connection Manager ──────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send(self, websocket: WebSocket, message: dict):
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            await self.send(connection, message)


manager = ConnectionManager()


# ─── Endpoints ───────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "operational", "version": "1.0.0", "agents": 5}


@app.get("/debug")
async def debug():
    """Debug endpoint — shows config and tests Gemini connection live"""
    import google.generativeai as genai

    result = {
        "gemini_key_set": bool(
            settings.gemini_api_key
            and settings.gemini_api_key != "your_gemini_api_key_here"
        ),
        "featherless_key_set": bool(
            settings.featherless_api_key
            and settings.featherless_api_key != "your_featherless_api_key_here"
        ),
        "speechmatics_key_set": bool(settings.speechmatics_api_key),
        "gemini_flash_model": settings.gemini_flash_model,
        "gemini_pro_model": settings.gemini_pro_model,
        "gemini_test": "not_tested",
        "gemini_error": None,
        "available_models": [],
    }

    if result["gemini_key_set"]:
        try:
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel(settings.gemini_flash_model)
            resp = model.generate_content("Reply with only the word: working")
            result["gemini_test"] = "success"
            result["gemini_response"] = resp.text.strip()
        except Exception as e:
            result["gemini_test"] = "failed"
            result["gemini_error"] = str(e)

        try:
            models = [
                m.name for m in genai.list_models()
                if "generateContent" in m.supported_generation_methods
            ]
            result["available_models"] = models[:15]
        except Exception as e:
            result["available_models_error"] = str(e)

    return result


@app.get("/agents")
async def get_agents():
    """Return metadata about all NEXUS agents"""
    return {
        name.value: {
            "name": meta.name.value,
            "role": meta.role,
            "icon": meta.icon,
            "color": meta.color,
            "model": meta.model,
        }
        for name, meta in AGENT_META.items()
    }


class TranscribeRequest(BaseModel):
    audio_base64: str
    language: str = "en"


@app.post("/transcribe")
async def transcribe_audio(req: TranscribeRequest):
    """Transcribe audio using Speechmatics"""
    text = await speechmatics.transcribe_base64(req.audio_base64, req.language)
    return {"transcript": text}


# ─── WebSocket Endpoint ───────────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    async def broadcaster(message: dict):
        await manager.send(websocket, message)

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            if data.get("type") == "ping":
                await manager.send(websocket, {"type": "pong"})
                continue

            if data.get("type") == "analyze":
                input_text = data.get("text", "").strip()
                session_id = data.get("session_id", str(uuid.uuid4()))

                if not input_text:
                    await manager.send(websocket, {
                        "type": "error",
                        "content": "No input provided."
                    })
                    continue

                await run_nexus_session(input_text, session_id, broadcaster)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        await manager.send(websocket, {"type": "error", "content": str(e)})
        manager.disconnect(websocket)


# ─── Core Orchestration Logic ─────────────────────────────────────────────────
async def run_nexus_session(input_text: str, session_id: str, broadcaster):
    """Run all 6 agents and synthesize results"""
    start_time = time.time()

    async def send(msg_type: str, **kwargs):
        await broadcaster({"type": msg_type, "session_id": session_id, **kwargs})

    await send("session_start", input=input_text, session_id=session_id)
    context = {}

    scout        = ScoutAgent(broadcaster)
    analyst      = AnalystAgent(broadcaster)
    strategist   = StrategistAgent(broadcaster)
    communicator = CommunicatorAgent(broadcaster)
    guardian     = GuardianAgent(broadcaster)
    orchestrator = OrchestratorAgent(broadcaster)

    try:
        # ── Phase 1: Scout ───────────────────────────────────────────────────
        await send("phase", phase="1", label="Intelligence Gathering", agents=["Scout"])
        scout_result = await scout.run(input_text, context)

        # ── Phase 2: Analyst + Strategist + Communicator (parallel) ─────────
        await send("phase", phase="2", label="Parallel Analysis", agents=["Analyst", "Strategist", "Communicator"])
        results = await asyncio.gather(
            asyncio.create_task(analyst.run(input_text, context)),
            asyncio.create_task(strategist.run(input_text, context)),
            asyncio.create_task(communicator.run(input_text, context)),
            return_exceptions=True,
        )
        analyst_result, strategist_result, communicator_result = results

        # ── Phase 2.5: Guardian audits all outputs ───────────────────────────
        await send("phase", phase="2.5", label="Trust & Security Audit", agents=["Guardian"])
        guardian_result = await guardian.run(input_text, context)

        # Check if synthesis was blocked
        if not context.get("guardian_cleared", True):
            await send("trust_warning",
                content="⛔ Guardian blocked synthesis due to critical trust violations. Review flags before proceeding.",
                trust_report=context.get("trust_report", {}),
            )

        # ── Phase 3: Orchestrator synthesizes everything ─────────────────────
        await send("phase", phase="3", label="Executive Synthesis", agents=["Orchestrator"])
        orchestrator_result = await orchestrator.run(input_text, context)

        # ── Build final report ───────────────────────────────────────────────
        elapsed_ms = int((time.time() - start_time) * 1000)
        final_report_data = context.get("final_report", {})

        report = {
            "session_id": session_id,
            "original_input": input_text,
            "executive_summary": final_report_data.get("executive_summary", ""),
            "full_brief": final_report_data.get("full_brief", orchestrator_result.content),
            "action_items": final_report_data.get("action_items", []),
            "risk_flags": final_report_data.get("risk_flags", []),
            "opportunity_flags": final_report_data.get("opportunity_flags", []),
            "decision_confidence": final_report_data.get("decision_confidence", 0.82),
            "trust_report": context.get("trust_report", {}),
            "processing_time_ms": elapsed_ms,
            "agent_results": [
                {"agent": scout_result.agent.value, "title": scout_result.title, "key_points": scout_result.key_points},
                {"agent": getattr(analyst_result, 'agent', type('', (), {'value': 'Analyst'})()).value,
                 "title": getattr(analyst_result, 'title', 'Analysis'),
                 "key_points": getattr(analyst_result, 'key_points', [])},
                {"agent": getattr(strategist_result, 'agent', type('', (), {'value': 'Strategist'})()).value,
                 "title": getattr(strategist_result, 'title', 'Strategy'),
                 "key_points": getattr(strategist_result, 'key_points', [])},
                {"agent": getattr(communicator_result, 'agent', type('', (), {'value': 'Communicator'})()).value,
                 "title": getattr(communicator_result, 'title', 'Communications'),
                 "key_points": getattr(communicator_result, 'key_points', [])},
                {"agent": guardian_result.agent.value, "title": guardian_result.title, "key_points": guardian_result.key_points},
            ]
        }

        await send("session_complete", report=report, processing_time_ms=elapsed_ms)

    except Exception as e:
        await send("session_error", error=str(e))
        raise
