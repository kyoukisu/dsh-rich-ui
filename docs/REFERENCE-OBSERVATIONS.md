# Reference observations · 2026-10-28

Source: https://chatgpt.com/share/6ae19175-cc80-83ed-8f84-befd5376ec83

Observed in anonymous ShardX browser at 2048 × 1088 viewport. This is observation, not inferred OpenAI internal architecture.

- Shared conversation contains inline entity buttons (`Interstellar`, `Inception`) in prose as well as image/text rows inside a bordered containing surface. Our first movie fixture currently has only portrait carousel cards, so it does not reproduce this full vocabulary yet.
- Clicking the inline `Interstellar` entity opened a right-side host panel. The conversation column reflowed/narrowed; the background was not covered by a full-screen dark modal scrim. The first local implementation instead opens a modal dialog with a dimmed blurred background: this is a **known behaviour/parity deviation**, not pixel-equivalent.
- In this anonymous shared session the entity panel displayed `Something went wrong. If this issue persists please contact us through our help center at help.openai.com.` and a retry glyph. Therefore successful entity detail contents/gallery geometry could not be captured or verified. Do not invent exact parity to unavailable success state.
- Desktop panel began at approximately x=1548 in the 2048 px screenshot (~500 px width). It has a small close icon in the upper right and a thin dividing line, visually part of the app shell.
- Reference text content column is approximately 768 px wide; typography appears larger than secondary UI metadata, with restrained borders and no card shadows in this scenario.
- Reference screenshots currently remain in ShardX cache, outside source control. Durable approved reference assets and exact measurement manifests still need capture at test widths. Nothing here is a computed-style extraction.

## Immediate consequence

Support separate **non-modal entity drawer** and **modal/lightbox** primitives; do not use one dialog for both. On narrow screens define and test the intended entity detail presentation separately. Keep unverified success state explicitly labelled.

## Evidence limitations

The shared conversation's assistant prose claims capabilities, but is not an authoritative component spec. Runtime controls and observed interaction are stronger evidence. Anonymous session failure does not imply entity panels always fail in logged-in ChatGPT.
