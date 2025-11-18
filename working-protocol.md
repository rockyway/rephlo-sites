# 📝 Agentic Coding Tool – Session Context Protocol

## 1. Purpose
This protocol ensures that the Agentic Coding Tool maintains continuity across long sessions by persisting tasks, prompts, and debugging steps into a structured session file. Context is preserved until the user explicitly confirms completion of each task. Large error logs are summarized to keep files lightweight and readable.

---

## 2. Session Lifecycle

- **Session Start**
  - On initiation, the **Master Agent** generates a file:
    ```
    current-session-[session-id].md
    ```
  - The file is initialized with:
    - Session metadata (ID, timestamp, user)
    - Empty **TODO list**
    - Context Log header

- **Session Active**
  - Each user prompt/instruction is appended to the session file.
  - The **TODO list** is updated whenever a new task is identified.
  - Debugging steps, implementation notes, and partial results are logged under a **Context Log** section.
  - Large error logs are summarized using the schema below.

- **Session End**
  - The session remains active until the user explicitly confirms all TODO items as **Done**.
  - If the user exits without confirmation, the file persists for recovery.

---

## 3. File Structure

```markdown
# Current Session – [session-id]

## Metadata
- Started: [timestamp]
- User: [user-id or name]
- Status: Active

---

## TODO List
- [ ] Implement feature X
- [ ] Debug error Y
- [ ] Refactor module Z

---

## Context Log
### Prompt 1
User: "Implement feature X"
Agent: "Generated initial code scaffold..."

### Prompt 2
User: "Dumping error log for tracing"
Agent: "Summary: NullReferenceException in AuthService.cs at line 42. Root cause: missing token validation."

(Log content omitted; summary retained)
```

---

## 4. Task Management Rules

- **Adding Tasks**
  - Each new instruction that implies work is added to the TODO list.
  - Format: `- [ ] Task description`

- **Updating Tasks**
  - If progress is made, add notes under **Context Log**.
  - Do not mark as done until explicit user confirmation.

- **Completing Tasks**
  - When the user confirms completion:
    - Update the TODO item to `- [x] Task description`
    - Add a completion note in **Context Log**

---

## 5. Summary Handling Rule

- **When user provides large error logs or verbose dumps:**
  - Do **not** store the full content in the session file.
  - Instead, generate a **concise summary**:
    - Error type(s)
    - File/module reference
    - Line numbers or key stack trace entries
    - Root cause (if identified)

- **Optional Reference**
  - If needed, store a pointer to the original log (e.g., temp file path or external reference), but not inline.

---

## 6. Error/Prompt Summary Schema

```markdown
## Summary Entry – [timestamp]

### Context
- **Prompt ID:** [auto-increment or UUID]
- **User Instruction:** [short description of what user asked]
- **Agent Action:** [short description of what agent attempted]

### Error Summary (if applicable)
- **Error Type:** [e.g., NullReferenceException, OutOfMemoryError]
- **Module/File:** [e.g., AuthService.cs, DataProcessor.java]
- **Line/Stack Reference:** [e.g., line 42, stack trace entry]
- **Root Cause (suspected):** [concise explanation]

### Resolution Status
- **TODO Item Linked:** [task description or ID]
- **Progress Notes:** [short notes on what has been tried]
- **Completion:** [Pending / Confirmed Done]

### References
- **Original Log Location:** [optional pointer to external file or temp path]
- **Related Tasks:** [list of other TODOs connected to this issue]
```

---

## 7. User Confirmation Protocol

- The Master Agent must request explicit confirmation before marking tasks as done:
  - Example:  
    ```
    Task "Debug error Y" appears resolved. Confirm completion (yes/no)?
    ```
- Only upon **yes** does the TODO item change to `[x]`.

---

## 8. Example Workflow

1. **Start Session** → File created: `current-session-123.md`
2. **User Prompt**: "Implement login feature"  
   → TODO list updated: `- [ ] Implement login feature`
3. **User Prompt**: "Here’s the Docker startup error log…"  
   → Agent extracts summary:  
   ```
   Summary: YAML config invalid at line 12. Key 'storage' missing.
   ```
   → Context Log updated with summary only.
4. **User Prompt**: "Fix the config issue"  
   → TODO list updated: `- [ ] Fix Docker YAML config`
5. **User Confirmation**: "Login feature is done."  
   → TODO updated: `- [x] Implement login feature`
6. **Session End**: All TODO items marked done → Status set to **Completed**.