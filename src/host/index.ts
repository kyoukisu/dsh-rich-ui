/** Node half: contributes instructions only; browser lifecycle is owned by DSH. */
export const name = '@kyoukisu/dsh-rich-ui'
export const inject = ['systemPrompt']

interface HostContext {
  systemPrompt: {
    getSectionOrder(name: string): number
    section(section: { name: string; order: number; text: string }): unknown
  }
}

export function apply(ctx: HostContext): void {
  ctx.systemPrompt.section({
    name: 'rich-ui:fence',
    order: ctx.systemPrompt.getSectionOrder('STRUCTURED_OUTPUT'),
    text: 'The rich-ui plugin can render a fenced `rich-ui` block containing a strict JSON RichSpec. Use only the documented rich-ui schema, never executable JavaScript, HTML or secrets. Actions are returned as [rich-ui-action] JSON user messages. Keep ordinary prose outside the fence. This language is separate from dsh-ui.',
  })
}
