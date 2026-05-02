# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Autonomous Progress

**Keep moving through the development plan without waiting for repeated "continue" confirmations.**

- After completing a subtask, automatically move to the next unfinished item in the development task list.
- Do not stop to ask the user before ordinary implementation decisions.
- Stop and ask only when there is a security risk, insufficient permission, conflicting requirements, a need to access external private resources, or a product decision that must be made by the user.
- For each completed work batch, verify with the relevant checks, update the task checklist, and report what changed plus the next item being handled.

## 6. Automation Concurrency Guard

**Only one automation run may write to this project at a time.**

- Before an automation run starts development work, it must check for `.codex-automation.lock` in the project root.
- If the lock file exists and its timestamp is less than 2 hours old, the automation must treat the previous run as still active and stop without editing files, committing, pushing, running migrations, or updating the task checklist.
- If the lock file exists and is more than 2 hours old, treat it as stale only after checking `git status` and active project processes; then replace it with a fresh lock.
- A running automation must create `.codex-automation.lock` before making changes. The lock should include the start time, branch, and short task summary.
- At the end of a successful or failed run, remove `.codex-automation.lock` before reporting results.
- If a run finds an active lock, its result should say that it skipped work because a previous automation run is still in progress.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
