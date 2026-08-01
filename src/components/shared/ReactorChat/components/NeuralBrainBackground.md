# Reactory Neural Background: Architecture, Integration & Data Flow Guide

This document provides a comprehensive technical overview of the **WebGL Neural Background Subsystem** (`NeuralBrainBackground.tsx`). It outlines the component's intent, visual capabilities, backend durable workflow integration, and the dynamic data loop that transforms live developer conversations into a glowing visual synapse map.

---

## 1. System Architecture Overview

The integration represents a synchronized loop between the client-side WebGL layer, the GraphQL API gateway, and the server-side durable workflow engine.

```mermaid
sequenceDiagram
  autonumber
  actor User as Developer / Agent
  participant RCS as ReactorConversationService
  participant WF as ProcessConversationWorkflow
  participant DB as MongoDB (System Graph)
  participant Chat as ReactorChat (PWA Client)
  participant WebGL as NeuralBrainBackground (Three.js)

  User->>RCS: Sends message / receives response
  Note over RCS: Message cycle completes
  RCS->>RCS: Schedules ProcessConversationWorkflow (60s delay)
  Note over RCS: (New message cancels previous schedule)
  RCS->>WF: Timeout fires: Triggers Workflow
  WF->>WF: Extracts key Topics, Files, & Projects (Provider-Agnostic)
  WF->>DB: Upserts nodes & links into reactor_nodes/links
  DB-->>Chat: Subgraph query detects updates
  Chat->>WebGL: Passes graphData or triggers self-fetching
  Note over WebGL: Computes stable 3D clusters & renders billboard labels
  WebGL-->>User: Renders live conversation graph as glowing clusters
```

---

## 2. Component Intent & Capabilities (`NeuralBrainBackground.tsx`)

The **Neural Background** is a high-fidelity, interactive, three-dimensional WebGL visualization designed to represent the "living mind" of the Reactor AI assistant. It serves as:
1.  An **immersive base layer** for the main chat interface (`backgroundMode` default `true`: pointer-events off, auto-orbiting camera).
2.  An **interactive diagnostic tool** in the side panel representing the active developer session's context (`backgroundMode={false}`, the default when mounted via the `reactor.NeuralBackground@1.0.0` registry entry).

### Dual Graph Perspective
The scene overlays two data perspectives, merged and deduplicated by node id:
*   **Conversation graph** (`origin: 'conversation'`): the synthesized subgraph around the conversation node, produced server-side by `ProcessConversationWorkflow` and fetched via `ReactorSubgraph`.
*   **Agent perspective** (`origin: 'agent'` / `'both'`): the nodes and edges the agent has touched through the reactor graph tools (`searchGraph`, `exploreGraph`, `getGraphNode`, `graphChildren`, `graphLinks`, `createNodeEdge`) during the active session. These are extracted client-side from `tool_results` in the chat history by the exported `extractAgentGraphFromMessages()` helper — no extra server round-trips. Agent-perspective neurons render larger and brighter (lerped toward white), their axons glow hotter, and in interactive mode they receive labels with a warm tint, so the agent's *current focus* visibly stands out from the ambient conversation memory.

`ReactorChat` feeds the live history via the `messages` prop; in standalone mode the component falls back to the cached session history in `localStorage` (`reactorChat.cachedSession`).

### Interactive Mode Controls (`backgroundMode={false}`)
*   **Pause / resume** (⏸/▶): freezes the simulation clock (camera drift, pulses, breathing) without tearing down the scene — implemented via a ref so toggling never rebuilds the WebGL resources.
*   **Label toggle** (Aa): shows/hides billboard labels at runtime.
*   **Reset view** (⟲): returns the camera to the auto-orbit rig.
*   **Camera**: drag to orbit, shift-drag or right-drag to pan, mouse wheel to zoom (clamped 4–60 units). The spherical rig seeds itself from the auto-orbit position on first grab, so there is no visual jump. Auto-orbit continues until the user takes control.

### Key Visual & Technical Features:
*   **Dual-Mode Operation**:
    *   *Prop-Driven*: Receives flat arrays of `nodes` and `edges` directly from a parent component.
    *   *Self-Sufficient (Standalone)*: If mounted without data (e.g., in the Side Panel), it uses the injected `reactory` SDK to read the active session ID from `localStorage`, queries the subgraph from the server, and sets up a 10s auto-refresh polling loop.
*   **Stable 3D Clustering**: Groups graph nodes by type (`TOPIC`, `FILE`, `FOLDER`, `PROJECT`, `SYSTEM`) and clusters them around dedicated 3D coordinate centers. It uses a **seed-based pseudo-random function** (`seedRandom`) to ensure that the same file or topic always renders in the exact same spot across page refreshes, providing visual continuity.
*   **Billboard Canvas Labels**: Spawns 2D HTML canvas-textured sprites floating above major hub neurons and project nodes. These labels automatically billboard (rotate to face the camera) and feature custom outline shadows to ensure maximum legibility against busy dark or light backgrounds.
*   **Interactive Synapses**: Renders glowing axons (`LineSegments`) linking related nodes. It pools animated electrochemical signal spheres (`SphereGeometry`) that travel along active axons.
*   **Haptic & Keyboard Interaction**: Moving the mouse raycasts interactive spark pulses outwards from hovered neurons, while typing on the keyboard triggers signal surges from project hubs.
*   **Strict Memory Management**: Disposes of all Three.js geometries, points materials, canvas textures, and renderers upon unmounting to guarantee zero GPU or memory leaks.

---

## 3. The Dynamic Graphing Loop

The visual background is populated dynamically as you converse with the AI or explore codebases:

### Phase A: Debounced Triggering
1.  When a message turn completes, `ReactorConversationService.ts` schedules the `ProcessConversationWorkflow` to run in **60 seconds** via a local `setTimeout`.
2.  If the developer sends another message before the 60 seconds expire, the pending timer is immediately cleared via `clearTimeout`. This ensures that graphing only runs when the developer pauses to think, read, or compile, preventing redundant background processing.

### Phase B: Provider-Agnostic Graph Extraction
1.  When the timer fires, the workflow engine executes the `ProcessConversationStep`.
2.  This step has been refactored to **extend `AgentConversationStep`**, making it completely provider-agnostic. Instead of hardcoding OpenAI API calls, it delegates the LLM turn to the parent class, which automatically resolves the persona's model, provider (OpenAI, Claude, Gemini, etc.), and credentials.
3.  The step passes a strict **JSON Schema** to the LLM to extract the conversation graph under `providerConfig.structuredOutput`. The model returns a structured JSON payload containing:
    *   `nodes`: Key projects, files, folders, or topics discussed.
    *   `edges`: The semantic relationships between them (e.g., `contains`, `references`, `depends_on`).

### Phase C: Graph Database Registration
1.  The workflow step creates a root node representing the **Conversation** itself.
2.  It generates deterministic, hashed IDs (`nodeId` and `linkId`) for all extracted items. Hashing ensures that re-graphing the same conversation updates existing nodes instead of creating duplicates.
3.  It upserts the nodes and links into MongoDB (`reactor_nodes` and `reactor_node_links` collections) and auto-links every extracted entity to the conversation root node via a `CONTAINS` edge.

### Phase D: Frontend Rendering
1.  The frontend detects the active session ID.
2.  `ReactorChat` queries the graph database via GraphQL (`ReactorSubgraph` query) up to a depth of **2** (with a limit of 120 nodes) and **polls every 15s** while the session is active — necessary because the workflow re-graphs the conversation ~60s after each completed turn. A graph **signature comparison** keeps the state identity stable when nothing changed, so the WebGL scene is only rebuilt on real graph updates (the standalone self-fetch applies the same dedup to its 10s loop).
3.  The retrieved nodes and edges are mapped to the Three.js canvas, instantly popping up as glowing neuron clusters with floating labels.
4.  The side-panel viewer (mounted via the 🧠 button) receives the same data as live props: ReactorChat pushes updated `graphData`, `messages`, and theme props into the mounted item via `sidePanelActions.updateItem()` whenever they change.

---

## 4. Dependent Elements & Files Touched

The WebGL background subsystem spans across multiple areas of the monorepo:

### PWA Client (`reactory-pwa-client`)
1.  **`src/components/shared/ReactorChat/components/NeuralBrainBackground.tsx`**:
    *   The core Three.js canvas rendering logic.
    *   Updated to support `showLabels` and the `reactory` SDK instance.
    *   Implemented the self-fetching React hook to pull graph data automatically when mounted standalone.
2.  **`src/components/shared/ReactorChat/components/SidePanel.tsx`**:
    *   Renders mounted workspace components.
    *   Updated the active tab wrapper `Box` to include `position: 'relative'` and `overflow: 'hidden'`. This establishes a local coordinate space, preventing the absolutely-positioned WebGL canvas from bleeding across other panels.
3.  **`src/components/shared/ReactorChat/hooks/macros/component.macro.tsx`**:
    *   The macro that handles mounting React components in the side panel.
    *   Removed the strict `typeof component === 'function'` check, which was causing memoized components (wrapped in `React.memo` or `React.forwardRef`) to be rejected as "invalid components".
4.  **`src/components/index.tsx`**:
    *   The central component registry.
    *   Registered `reactor.NeuralBackground@1.0.0` mapping to `NeuralBrainBackground`.

### Express Server (`reactory-express-server`)
1.  **`src/modules/reactory-reactor/workflow/steps/ProcessConversationStep.ts`**:
    *   Refactored the step to inherit from `AgentConversationStep`.
    *   Replaced the hardcoded `OpenAIService` completion call with a provider-agnostic, structured-output configuration, allowing the step to use any configured LLM (e.g., Claude, Gemini) to extract the graph.
2.  **`src/modules/reactory-reactor/workflow/index.ts`**:
    *   Added `'ProcessConversationWorkflow'` to the module's registered workflows array so it is discovered and registered in the database on server startup.
3.  **`src/modules/reactory-reactor/workflow/ProcessConversationWorkflow.yaml`**:
    *   The durable workflow registry definition that orchestrates the graphing step.
