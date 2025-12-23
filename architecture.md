# AI Video Interviewer – Full System Architecture

## 1. Purpose
This system enables companies to run **live, AI-led video interviews** where:
- A candidate joins a video call
- An AI interviewer asks spoken questions
- The AI listens to answers in real time
- The AI adapts follow-ups and pacing
- The interview is scored and evaluated
- **Each company fully controls interview questions, behavior, and scoring**

This is not a chatbot. It is a **stateful interview engine**.

---

## 2. Tech Stack
- Frontend: Next.js (App Router)
- Backend: Next.js API Routes + Server Actions
- Auth & DB: Supabase
- Video: WebRTC provider (LiveKit / Daily / Twilio)
- Speech-to-Text: Streaming STT API
- Text-to-Speech: Streaming TTS API
- LLM: OpenAI-compatible API

---

## 3. High-Level Flow

Company Admin → Define Interview Template  
Candidate → Joins Video Interview  
AI Orchestrator → Runs Interview Loop  
Supabase → Source of Truth

---

## 4. Folder Structure

```
/ai-video-interviewer
├── app/
│   ├── (auth)/
│   ├── candidate/interview/[interviewId]/page.tsx
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── templates/
│   │   │   ├── page.tsx
│   │   │   └── [templateId]/edit/page.tsx
│   │   └── interviews/
│   ├── api/
│   │   ├── interviews/
│   │   │   ├── start.ts
│   │   │   ├── next-turn.ts
│   │   │   └── end.ts
│   │   ├── templates/
│   │   │   ├── create.ts
│   │   │   ├── update.ts
│   │   │   └── publish.ts
│   │   ├── rtc/token.ts
│   │   └── speech/
│   │       ├── stt.ts
│   │       └── tts.ts
│   └── layout.tsx
├── components/
│   ├── VideoRoom.tsx
│   ├── AIAvatar.tsx
│   ├── TranscriptPanel.tsx
│   └── Admin/
│       ├── TemplateEditor.tsx
│       ├── QuestionBuilder.tsx
│       └── VersionSelector.tsx
├── lib/
│   ├── supabase/
│   ├── interview/
│   │   ├── orchestrator.ts
│   │   ├── stateMachine.ts
│   │   ├── evaluator.ts
│   │   └── scoring.ts
│   ├── rtc/provider.ts
│   ├── speech/stt.ts
│   ├── speech/tts.ts
│   └── llm/interviewer.ts
├── types/
│   ├── interview.ts
│   ├── template.ts
│   └── scoring.ts
├── supabase/migrations/
├── architecture.md
└── tasks.md
```

---

## 5. Data Model (Supabase)

### organizations
- id (uuid, pk)
- name
- created_at

### organization_members
- org_id
- user_id
- role (owner | admin | reviewer)

### interview_templates
- id
- org_id
- name
- status (draft | published | archived)
- active_version_id
- created_at

### interview_template_versions
- id
- template_id
- version
- config (jsonb)
- created_at
- published_at

### interviews
- id
- org_id
- template_version_id
- candidate_name
- status (scheduled | live | completed)
- current_question_id
- created_at

### interview_turns
- id
- interview_id
- speaker (ai | candidate)
- transcript
- timestamp

### evaluations
- interview_id
- scores (jsonb)
- decision (advance | hold | reject)

---

## 6. Interview Template Config (JSON)

Controls **everything** about interview behavior.

```
{
  "system_prompt": "You are a professional interviewer for {{org_name}}.",
  "voice": { "voice_id": "neutral", "speed": 1.0 },
  "questions": [
    {
      "id": "availability",
      "prompt": "Which days and times can you work?",
      "followups": [
        {
          "condition": "vague",
          "prompt": "Please give exact days and time blocks."
        }
      ],
      "rubric": {
        "signal": "schedule_clarity",
        "weight": 0.25
      }
    }
  ],
  "policies": {
    "max_followups_per_question": 1,
    "min_answer_seconds": 6
  }
}
```

---

## 7. Interview Orchestrator

- Loads template config
- Tracks current question
- Sends prompts to LLM
- Plays AI voice via TTS
- Streams candidate audio to STT
- Evaluates answer
- Decides follow-up vs next question
- Persists every turn

This is implemented as a deterministic state machine.

---

## 8. State Ownership

- Frontend: media streams, UI state
- Backend: interview state + progression
- Supabase: canonical record
- LLM: stateless turn evaluation

---

## 9. Security
- Row Level Security by org
- Candidates restricted to their interview
- Templates immutable once published
- Full transcript auditability

---
