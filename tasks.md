# tasks.md — Ultra-Granular MVP Build Plan (AI Video Interviewer)

RULES:
- One concern per task
- One observable output per task
- One verification step per task
- No task assumes success of another unless explicitly stated

---

## SECTION 0 — REPOSITORY BASELINE

0.1 Create empty Git repository  
Start: No repo exists  
End: Repo exists with main branch  
Test: Repo visible on GitHub

0.2 Initialize Next.js App Router project  
Start: Empty repo  
End: Next.js files generated  
Test: `npm run dev` shows default page

0.3 Add TypeScript strict mode  
Start: Default tsconfig  
End: `"strict": true` enabled  
Test: `tsc --noEmit` passes

0.4 Add ESLint config  
Start: No lint config  
End: ESLint runs  
Test: `npm run lint` passes

0.5 Add environment variable loader  
Start: No env validation  
End: App fails on missing env  
Test: Remove env var → app throws on boot

---

## SECTION 1 — SUPABASE CONNECTION

1.1 Create Supabase project  
Start: No project  
End: Project exists  
Test: Dashboard accessible

1.2 Enable email/password auth  
Start: Auth disabled  
End: Auth enabled  
Test: User can be created in dashboard

1.3 Add Supabase browser client  
Start: No client  
End: `supabaseBrowserClient` exported  
Test: Client can call `auth.getSession()`

1.4 Add Supabase server client  
Start: No server client  
End: `supabaseServerClient` exported  
Test: Server component reads session

1.5 Verify session persistence  
Start: User logged in  
End: Session persists after refresh  
Test: Reload page, still authenticated

---

## SECTION 2 — ORGANIZATION MODEL

2.1 Create `organizations` table  
Start: No table  
End: Table exists  
Test: Insert row via SQL editor

2.2 Create `organization_members` table  
Start: No table  
End: Table exists  
Test: Insert org_id + user_id

2.3 Add RLS: org readable only by members  
Start: No RLS  
End: RLS enabled  
Test: Non-member query fails

2.4 Add helper: resolve current org for user  
Start: No helper  
End: Function returns org_id  
Test: Correct org_id returned

2.5 Create org creation server action  
Start: No action  
End: Org + owner membership created  
Test: DB has both rows

---

## SECTION 3 — TEMPLATE DATA MODEL

3.1 Create `interview_templates` table  
Start: No table  
End: Table exists  
Test: Insert draft template

3.2 Create `interview_template_versions` table  
Start: No table  
End: Table exists  
Test: Insert version row

3.3 Enforce FK from version → template  
Start: No constraint  
End: FK enforced  
Test: Invalid template_id insert fails

3.4 Add RLS: templates scoped to org  
Start: No RLS  
End: RLS enabled  
Test: Cross-org access blocked

3.5 Define template JSON schema (zod)  
Start: No schema  
End: Schema validates sample  
Test: Invalid config rejected

3.6 Add server validator for template config  
Start: No validator  
End: Validator throws on bad input  
Test: Pass invalid JSON → error

3.7 Create draft template version action  
Start: No action  
End: Draft version row created  
Test: version=1 exists

3.8 Add publish action  
Start: Draft version  
End: published_at set  
Test: published_at not null

3.9 Prevent updates to published versions  
Start: Published version editable  
End: Updates rejected  
Test: Update attempt fails

---

## SECTION 4 — TEMPLATE ADMIN UI

4.1 Render template list page  
Start: No UI  
End: List renders  
Test: Shows only org templates

4.2 Add “Create template” button  
Start: No button  
End: Button visible  
Test: Click triggers create action

4.3 Render template edit page shell  
Start: Blank route  
End: Page loads template  
Test: Name displayed

4.4 Render JSON editor with config  
Start: No editor  
End: Editor shows config  
Test: JSON visible

4.5 Validate JSON on save  
Start: Save accepts invalid  
End: Save blocked on invalid  
Test: Invalid JSON rejected

4.6 Publish template from UI  
Start: Draft template  
End: Status becomes published  
Test: UI reflects published state

---

## SECTION 5 — INTERVIEW INSTANCE

5.1 Create `interviews` table  
Start: No table  
End: Table exists  
Test: Insert row

5.2 Create `interview_turns` table  
Start: No table  
End: Table exists  
Test: Insert turn

5.3 Create `evaluations` table  
Start: No table  
End: Table exists  
Test: Insert evaluation

5.4 Create interview creation API  
Start: No endpoint  
End: Interview row created  
Test: DB row exists

5.5 Generate candidate access token  
Start: No token  
End: Token generated  
Test: Token validates

5.6 Validate candidate token  
Start: No validation  
End: Invalid token rejected  
Test: Invalid token blocked

---

## SECTION 6 — VIDEO ROOM

6.1 Add WebRTC SDK  
Start: No SDK  
End: SDK imported  
Test: Build passes

6.2 Create RTC token API  
Start: No endpoint  
End: Token returned  
Test: Token usable by client

6.3 Join video room as candidate  
Start: No join  
End: Connected to room  
Test: Self video visible

6.4 Render local video  
Start: No video  
End: Video renders  
Test: Camera visible

6.5 Handle disconnect event  
Start: No handler  
End: Disconnect logged  
Test: Refresh triggers handler

---

## SECTION 7 — AUDIO CAPTURE

7.1 Capture microphone stream  
Start: No audio  
End: Audio stream available  
Test: Stream object exists

7.2 Chunk audio into frames  
Start: Raw stream  
End: PCM chunks produced  
Test: Chunks logged

7.3 Detect silence  
Start: No silence logic  
End: Silence detected  
Test: Silence triggers callback

---

## SECTION 8 — SPEECH-TO-TEXT

8.1 Add STT backend wrapper  
Start: No wrapper  
End: Function returns transcript  
Test: Sample audio transcribed

8.2 Send audio chunks to STT  
Start: No streaming  
End: Chunks accepted  
Test: Backend receives chunks

8.3 Finalize transcript  
Start: Partial text  
End: Final string  
Test: Transcript persisted

8.4 Persist candidate turn  
Start: No DB row  
End: interview_turns row created  
Test: Row exists

---

## SECTION 9 — AI QUESTION DELIVERY

9.1 Load template config for interview  
Start: No load  
End: Config object available  
Test: Correct template_version used

9.2 Extract current question  
Start: No question  
End: Question object  
Test: Matches config

9.3 Generate AI speech via TTS  
Start: No audio  
End: Audio buffer returned  
Test: Plays sound

9.4 Persist AI turn  
Start: No DB row  
End: interview_turns row created  
Test: Speaker=ai

---

## SECTION 10 — LLM EVALUATION

10.1 Build evaluator prompt  
Start: No prompt  
End: Prompt string  
Test: Prompt contains rubric

10.2 Call LLM evaluator  
Start: No call  
End: JSON response  
Test: Response parsed

10.3 Validate evaluator output schema  
Start: No validation  
End: Invalid output rejected  
Test: Bad output throws

10.4 Detect follow-up condition  
Start: No logic  
End: Boolean decision  
Test: Vague answer → true

---

## SECTION 11 — INTERVIEW LOOP

11.1 Advance to follow-up  
Start: Follow-up needed  
End: Follow-up question asked  
Test: AI speaks follow-up

11.2 Advance to next question  
Start: No follow-up  
End: Next question asked  
Test: Question index increments

11.3 End interview after last question  
Start: Last question answered  
End: Interview marked complete  
Test: status=completed

---

## SECTION 12 — SCORING

12.1 Initialize score accumulator  
Start: No scores  
End: Zeroed object  
Test: All signals zero

12.2 Apply rubric weight  
Start: Raw signal score  
End: Weighted score  
Test: Deterministic result

12.3 Compute total score  
Start: Partial scores  
End: Total number  
Test: Same inputs → same total

12.4 Persist evaluation  
Start: No row  
End: evaluations row exists  
Test: Row linked to interview

---

## SECTION 13 — ADMIN REVIEW

13.1 Render admin interview list  
Start: No list  
End: List visible  
Test: Shows interviews

13.2 Render transcript view  
Start: No transcript  
End: Ordered turns visible  
Test: Matches DB order

13.3 Render score breakdown  
Start: No scores  
End: Scores visible  
Test: Matches evaluation

---

## SECTION 14 — CONFIGURABILITY PROOF

14.1 Create template A with unique wording  
Test: Interview uses wording A

14.2 Create template B with different wording  
Test: Interview uses wording B

14.3 Run interviews from two orgs  
Test: No template leakage

---

## SECTION 15 — MVP ACCEPTANCE

15.1 Candidate completes interview end-to-end  
15.2 AI adapts follow-ups  
15.3 Admin reviews transcript + score  
15.4 Template edits change behavior for new interviews  
15.5 Old interviews remain immutable

MVP COMPLETE WHEN ALL ABOVE PASS.
