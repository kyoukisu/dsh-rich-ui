# What we borrowed from the Codex prompt

Source: leaked Codex instructions, `OpenAI/Codex/old/gpt-5.2-codex.md` in
[asgeirtj/system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks/blob/main/OpenAI/Codex/old/gpt-5.2-codex.md),
checked 2026-10-28. Codex has no rich-UI component language, so the useful part is
not component syntax — it is the **restraint and formatting discipline** around output.

## Borrowed

| Codex rule                                                                                        | How it is expressed in our contract                                                       |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| "Formatting should make results easy to scan, but not feel mechanical."                           | Explicit rule that structure is not decoration, and one short fact stays prose.           |
| "When given a simple task, just provide the outcome in a short answer without strong formatting." | Trigger sentence: blocks only when they carry structure or interaction prose cannot.      |
| "Never use nested bullets."                                                                       | Composition rule: no card inside a card, no duplicated data (chart plus identical table). |
| Monospace for literal tokens.                                                                     | Inline `code` for fields, values, commands; `**bold**` for emphasis only.                 |

## Rejected

- Codex's markdown guidance is about text documents; our renderer accepts only two
  inline marks (`code`, `bold`). Adopting markdown habits would silently produce
  literal asterisks and hashes, so the contract now states the limit and points to
  structural nodes instead.
- Codex has no notion of local interaction, so nothing about state or actions was
  transferable.

## Consequence

The prompt grows by roughly 200 tokens; it also removes a class of failure where a
model writes a heading or a link inside a `text` node and it appears as raw characters.
