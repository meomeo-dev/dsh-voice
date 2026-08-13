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

## 3. Write the structured tone

The file is **structured**: the final prompt is assembled by a Handlebars template from three fields. Do not write a single free-form `prompt` string.

1. **identity (object)** — `role` (角色定位), `background` (背景,含对用户的称呼), `address` (角色对用户的称呼,如「博士」).
2. **style (string)** — the style rules from step 2.
3. **examples (array)** — exactly 10 scenarios, each with `name` and a `turns` array of 3–5 `{ speaker, text }` dialogue turns. Scenarios must be mutually distinct; anchor the persona to real agent situations (onboarding, finishing work, debugging, encouragement, refusing a dangerous request, explaining a concept, pride in work, receiving praise, parting, small talk). Use the character's address term (e.g. 博士) as one speaker and the character's name as the other.

## 4. Validate and place the file

Write the file as `<id>.voice.yaml` in a `voice/` directory:

- **User-level (default):** `~/.dsh/voice/` (dsh config dir). If you are not in a dsh environment, use `~/.agents/voice/` instead.
- **Project-level:** `<repo>/.dsh/voice/` (dsh config dir), falling back to `<repo>/.agents/voice/`.

File shape (v2):

```yaml
version: 2
id: <id>          # kebab-case, must match the filename basename
label: <Label>    # display name
description: <一句话说明>
identity:
  role: <角色定位>
  background: <背景,含对用户的称呼>
  address: <对用户的称呼,如 博士>
style: |
  <4–8 条说话方式规则>
examples:
  - name: <场景名>
    turns:
      - speaker: <说话人>
        text: <台词>
      # ... 3–5 turns
```

Constraints:

- `id` is lowercase kebab-case and must equal the filename basename (`ling` → `ling.voice.yaml`).
- `identity.role`, `identity.background`, and `style` are non-empty.
- `examples` has exactly 10 entries when the tone is a fleshed-out persona; each has 3–5 turns.
- The whole file is valid YAML; indent the `prompt`-replacing fields consistently.

After writing, verify with `dsh-voice check <dir>` (or `pnpm dsh-voice check <dir>`), and tell the user they can switch to it with `/voice <id>`.
