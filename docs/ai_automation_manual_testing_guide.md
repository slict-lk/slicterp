# Extensive AI Automation - Real-World Scenario Test Guide

Welcome to the comprehensive tester's guide for the AI Automation module. This guide assumes zero prior knowledge of the module and will walk you through setting up a **fully operational real-world business scenario**: Automating the triage of incoming Customer Support emails and strictly mandating human approval before assigning high-priority tickets or taking drastic actions.

By executing this guide from start to finish, you will populate data in all the AI dashboard tabs and see how the orchestration natively flows from one component to another.

---

## The Scenario Goal
**"We want an AI Agent to read incoming customer emails, categorize them, and if an issue looks high risk (like a VIP cancellation), it must flag a human manager for approval before assigning it to the urgent queue."**

---

### Phase 1: Engine Foundation
*The AI needs a brain and a personality to know how to speak.*

#### 1. Models (`/ai/models`)
**Functionality:** This dictates *which* external AI provider (like Groq, OpenAI, or Ollama) will actually process the text. You must register at least one model to handle workflows for your tenant.
- [ ] **Navigate to:** AI & Automation > Models
- [ ] **Action:** Click **"Add Model"**
- [ ] **Input Mock Data:**
  - **Name:** `Fast Triage Engine`
  - **Provider:** `GROQ`
  - **Model ID:** `llama-3.3-70b-versatile` 
  - **API Endpoint:** (Leave empty/default)
  - **API Key:** `gsk_mock_triage_key_123` (Note: Even a dummy key works for UI testing, but you'll need a real one for end-to-end execution)
  - **Capabilities:** Select `Chat` and `Reasoning`
- [ ] **Save:** The model should now appear as registered.

#### 2. Prompts (`/ai/prompts`)
**Functionality:** Prompts are reusable templates and rules that you inject into your AI bots so you don't have to rewrite instructions constantly.
- [ ] **Navigate to:** AI & Automation > Prompts
- [ ] **Action:** Click **"Create Prompt"**
- [ ] **Input Mock Data:**
  - **Name:** `Triage-Persona`
  - **Type:** `System Instruct`
  - **Text:** *"You are an expert customer support triage agent for SLICT ERP. Read the user's inquiry, determine their problem, and categorize it as either `LOW`, `MEDIUM`, or `HIGH` risk. If they mention cancellation, refund, or legal action, it is strictly `HIGH` risk."*
- [ ] **Save.**

---

### Phase 2: Agent Creation & Guardrails
*Constructing the worker and putting safety laws in place.*

#### 3. Agents (`/ai/agents`)
**Functionality:** Agents are virtual employees. You combine a Model + a Prompt + Tools (Adapters) to give them a specific job purpose.
- [ ] **Navigate to:** AI & Automation > Agents
- [ ] **Action:** Click **"New Agent"**
- [ ] **Input Mock Data:**
  - **Name:** `Ticket Triage Bot`
  - **Description:** `Reads emails and assigns priority queues.`
  - **Model Binding:** Select `Fast Triage Engine` (created in Step 1)
  - **System Prompt:** Select `Triage-Persona` (created in Step 2)
  - **Adapters (Tools):** Check off `CRM Ticket Creator` or similar capability if exposed on your UI.
- [ ] **Save and Publish.**

#### 4. Policies (`/ai/policies`)
**Functionality:** Policies act as safety nets. They define what an Agent is allowed to do autonomously versus what requires a human manager to click "Approve". 
- [ ] **Navigate to:** AI & Automation > Policies
- [ ] **Action:** Click **"New Policy"**
- [ ] **Input Mock Data:**
  - **Name:** `Strict VIP Guardrail`
  - **Target Agent/Scope:** `Ticket Triage Bot` (or Global)
  - **Condition:** Select `Risk Score > 80` OR `Action = 'Escalate Ticket'`
  - **Enforcement:** Select `TWO_STEP_APPROVAL`
  - **Approver Group:** Select `Managers` or `Admins`
- [ ] **Save Policy.** Now the agent cannot execute high-priority operations without asking you first!

---

### Phase 3: Orchestration & Simulation
*Connecting the trigger to the agent, and making it run.*

#### 5. Workflows (`/ai/workflows`)
**Functionality:** Workflows are the actual "if this happens, run that agent" pipelines. 
- [ ] **Navigate to:** AI & Automation > Workflows
- [ ] **Action:** Click **"New Automation"**
- [ ] **Input Mock Data:**
  - **Name:** `Process Incoming Email`
  - **Trigger Node:** Select `External Event` or `New Item Created`
  - **Trigger Condition:** `Message Source = 'Support Inbox'`
  - **Action Node (Step 1):** Execute Agent -> Select `Ticket Triage Bot`
  - **Action Node (Step 2):** Create CRM Ticket (Payload = Output from Step 1)
- [ ] **Save and toggle Active.**

#### 6. Events (`/ai/events`)
**Functionality:** A real-time firehose of every trigger and signal hitting the system. 
- [ ] **Action:** We need to simulate the trigger. If your UI has a "Simulate Event" button on the Workflows page, click it. If not, trigger it via your standard ERP by navigating to the CRM module and manually creating a mock "Support Ticket" named: *"Immediate Cancellation - I am suing you"*. 
- [ ] **Navigate to:** AI & Automation > Events
- [ ] **Verify:** You should see a raw event logged on this page representing the ticket creation or the simulated webhook payload.

---

### Phase 4: Human Supervision & Analytics
*Evaluating the results and approving the blocked action.*

#### 7. Approvals / Inbox (`/ai/approvals`)
**Functionality:** The holding pen where the AI waits for your permission to proceed because it hit the Policy guardrail created in Phase 2.
- [ ] **Navigate to:** AI & Automation > Approvals (or Command Center Inbox)
- [ ] **Verify:** You should see a pending request from the `Ticket Triage Bot`.
- [ ] **Review:** Click into it. It will show you the exact JSON payload the bot wants to execute (e.g., categorizing the ticket as `HIGH` risk and routing it to the VIP queue). Because it was high risk, the policy stopped it.
- [ ] **Action:** Click **"Approve"**. The workflow now resumes and finishes.

#### 8. Audit (`/ai/audit`)
**Functionality:** The unalterable security log of everything AI-related. 
- [ ] **Navigate to:** AI & Automation > Audit
- [ ] **Verify:** Search the log rows. You should see entries in chronological order:
  - You created a Model.
  - You created an Agent.
  - The Workflow triggered.
  - The AI action was *Blocked pending approval*.
  - You *Approved* the action.

#### 9. Analytics (`/ai/analytics`)
**Functionality:** The CFO's dashboard indicating how much money your AI calls are costing in API tokens.
- [ ] **Navigate to:** AI & Automation > Analytics
- [ ] **Verify:** You should see visual charts. Because the Triage bot processed a prompt and generated a response during the workflow, your "Tokens Consumed" graph should have spiked slightly today.

#### 10. Copilots (`/ai/copilots`)
**Functionality:** Configures how internal employees chat with the AI (the bottom right corner chat bubble).
- [ ] **Navigate to:** AI & Automation > Copilots
- [ ] **Verify:** Here, instead of background workflow bots, you configure the interactive floating button bots. Create a new copilot named `HR Chat` and limit its scope. Opening the floating chat bubble across the site will now reflect this configuration.

---

### Summary Checklist Success
By completing this scenario, you have successfully:
1. Registered AI brain keys (Models)
2. Defined its personality (Prompts)
3. Hired the virtual worker (Agents)
4. Placed a manager above it (Policies)
5. Told it when to wake up (Workflows) 
6. Processed an input (Events)
7. Approved its blocked work manually (Approvals)
8. Reviewed its security footprints (Audit)
9. Checked its token costs (Analytics)
