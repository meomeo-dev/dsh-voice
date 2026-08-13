---
name: create-voice
description: Create a new conversation tone (口吻) as a *.voice.yaml file in a voice/ config directory. Use when the user asks to make, add, or design a new speaking style / persona / 口吻 for the agent.
---

# Create a conversation tone (voice)

Use this skill to author a new `*.voice.yaml` tone file and place it in a `voice/` config directory so `dsh-voice` picks it up and the user can switch to it with `/voice <id>`.

## 1. Gather the character

1. Identify the target: a named character (game/anime/book) or an abstract speaking style the user described.
2. Search for authoritative material — the character's official profile, and their actual spoken lines (台词 / voice lines / quotes). Prefer primary sources (official wiki, in-game transcripts) over fan summaries.
3. Fetch the full profile and lines; extract (a) identity/background, (b) concrete spoken-line samples, (c) any recurring imagery or verbal tics.

## 2. Analyze the speaking style

From the gathered lines, distill 4–8 concrete, executable style rules — not vague adjectives. For each rule, name the observable feature (sentence rhythm, repeated imagery, register, address terms) and, where possible, ground it in an actual quoted line. Add one hard rule at the end: the tone must stay accurate and useful — it never overrides correctness, safety, or executability.

## 3. Write the tone prompt

Compose the `prompt` field as self-contained text with three sections:

1. **身份背景** — one short paragraph on who the character is, and how they address the user.
2. **说话方式** — the style rules from step 2.
3. **场景示例** — exactly 10 scenarios, each 3–5 dialogue turns, scenarios mutually distinct, with the user as "博士" (or the character's natural address term). Anchor the persona to real agent situations (onboarding, finishing work, debugging, encouragement, refusing a dangerous request, explaining a concept, pride in work, receiving praise, parting, small talk).

## 4. Validate and place the file

Write the file as `<id>.voice.yaml` in a `voice/` directory:

- **User-level (default):** `~/.dsh/voice/` (dsh config dir). If you are not in a dsh environment, use `~/.agents/voice/` instead.
- **Project-level:** `<repo>/.dsh/voice/` (dsh config dir), falling back to `<repo>/.agents/voice/`.

File shape:

```yaml
version: 1
id: <id>          # kebab-case, must match the filename basename
label: <Label>    # display name
description: <一句话说明>
prompt: |
  <身份背景 + 说话方式 + 10 场景示例>
```

Constraints:

- `id` is lowercase kebab-case and must equal the filename basename (`ling` → `ling.voice.yaml`).
- `prompt` is non-empty and must contain the three sections above.
- Keep the whole file valid YAML; indent the `prompt:` block consistently.

After writing, verify with `dsh-voice check <dir>` (or `pnpm dsh-voice check <dir>`), and tell the user they can switch to it with `/voice <id>`.
