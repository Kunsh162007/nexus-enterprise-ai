graph TB
    subgraph INPUT["🎤 User Input Layer"]
        UI["React Frontend\nTailwind + Framer Motion"]
        VOICE["Speechmatics\nReal-time Voice STT"]
        UI <--> VOICE
    end

    subgraph BACKEND["⚡ FastAPI Backend — Vultr VM"]
        WS["WebSocket Server\nReal-time streaming"]
        BUS["Async Message Bus\nasyncio + Redis"]
        WS --> BUS
    end

    subgraph PHASE1["Phase 1 — Intelligence Gathering"]
        SCOUT["🔍 Scout Agent\nFeatherless · Mistral-7B\nFact extraction & urgency triage"]
    end

    subgraph PHASE2["Phase 2 — Parallel Analysis (concurrent)"]
        ANALYST["📊 Analyst\nGemini 2.0 Flash\nFinancial impact & risk matrices"]
        STRATEGIST["🎯 Strategist\nGemini 2.0 Pro\nStrategic options generation"]
        COMMUNICATOR["📢 Communicator\nGemini 2.0 Flash\nStakeholder communication drafts"]
    end

    subgraph PHASE3["Phase 3 — Executive Synthesis"]
        ORCH["🎭 Orchestrator\nGemini 2.0 Pro\nDecisive executive brief"]
    end

    subgraph OUTPUT["📋 Output"]
        BRIEF["Executive Brief\nAction items · Risks · Opportunities"]
        COMMS["Ready-to-send\nCommunications"]
        STRATEGY["3 Strategic\nOptions"]
    end

    UI -->|"WebSocket"| WS
    BUS --> SCOUT
    SCOUT -->|"Context + Intel"| ANALYST
    SCOUT -->|"Context + Intel"| STRATEGIST
    SCOUT -->|"Context + Intel"| COMMUNICATOR
    ANALYST -->|"Analysis results"| ORCH
    STRATEGIST -->|"Strategy options"| ORCH
    COMMUNICATOR -->|"Comm drafts"| ORCH
    ORCH --> BRIEF
    ORCH --> COMMS
    ORCH --> STRATEGY
    BRIEF -->|"WebSocket stream"| UI

    classDef agent fill:#1e2d4a,stroke:#6366f1,color:#a5b4fc
    classDef phase fill:#050914,stroke:#1e2d4a,color:#8899bb
    classDef partner fill:#0d1424,stroke:#374151,color:#9ca3af

    class SCOUT,ANALYST,STRATEGIST,COMMUNICATOR,ORCH agent
