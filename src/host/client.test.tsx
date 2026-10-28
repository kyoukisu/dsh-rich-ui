// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { actionHandler, installDomRenderer, parseFence, type ClientContext } from './client'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

const sample = { version: 1, nodes: [{ type: 'text', content: 'Hello rich UI' }] }
const ctx = (send = vi.fn().mockResolvedValue(undefined)): ClientContext => ({
  sessions: {
    list: { getSnapshot: () => ({ ids: ['session-one'] }) },
    retainInfo: () => ({ getSnapshot: () => ({ retainedBy: { mainView: 1 } }) }),
    scope: () => ({ get: () => ({ send }) }),
  },
})
let dispose: (() => void) | undefined
async function tick() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) }) }
function source(raw = JSON.stringify(sample), kind = 'assistant-step') {
  const row = document.createElement('div')
  row.dataset.chatFlowKind = kind
  const block = document.createElement('div')
  block.className = 'md-code-block'
  const label = document.createElement('div')
  label.textContent = 'rich-ui'
  const pre = document.createElement('pre')
  pre.textContent = raw
  block.append(label, pre)
  row.append(block)
  document.body.append(row)
  return { row, block, pre }
}
afterEach(async () => {
  await act(async () => { dispose?.() })
  dispose = undefined
  document.body.replaceChildren()
})

describe('strict fence input', () => {
  it('accepts schema-valid strict JSON and rejects malformed, unsafe, oversized data', () => {
    expect(parseFence(JSON.stringify(sample))).not.toBeNull()
    for (const bad of ['{', '{}', '{"__proto__":{}}', ' '.repeat(256001), '{"version":1,"nodes":[{"type":"html","html":"<script>"}]}']) {
      expect(parseFence(bad)).toBeNull()
    }
  })
})

describe('installed-host DOM contract', () => {
  it('mounts a real RichResponse, restores raw source on unload', async () => {
    const { block } = source()
    await act(async () => { dispose = installDomRenderer(ctx()) })
    await tick()
    expect(block.hidden).toBe(true)
    expect(document.querySelector('[data-rich-ui-root]')?.textContent).toContain('Hello rich UI')
    await act(async () => { dispose?.() })
    expect(block.hidden).toBe(false)
    expect(document.querySelector('[data-rich-ui-root]')).toBeNull()
  })
  it('does not mount user fences or incomplete streaming JSON; observes settlement', async () => {
    const user = source(JSON.stringify(sample), 'user')
    const assistant = source('{')
    assistant.row.dataset.streaming = ''
    dispose = installDomRenderer(ctx())
    await tick()
    expect(document.querySelector('[data-rich-ui-root]')).toBeNull()
    await act(async () => {
      assistant.pre.textContent = JSON.stringify(sample)
      delete assistant.row.dataset.streaming
    })
    await tick()
    expect(assistant.block.hidden).toBe(true)
    expect(user.block.hidden).toBe(false)
  })
  it('restores invalid revisions and unmounts removed message roots', async () => {
    const { row, block, pre } = source()
    await act(async () => { dispose = installDomRenderer(ctx()) })
    await tick()
    await act(async () => { pre.textContent = '{' })
    await tick()
    expect(block.hidden).toBe(false)
    expect(document.querySelector('[data-rich-ui-root]')).toBeNull()
    await act(async () => { pre.textContent = JSON.stringify(sample) })
    await tick()
    await act(async () => { row.remove() })
    await tick()
    expect(row.querySelector('[data-rich-ui-root]')).toBeNull()
  })
  it('sends an action through the captured scoped conversation, not current UI routing', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const context = ctx(send)
    const scope = vi.spyOn(context.sessions, 'scope')
    actionHandler(context, 'original-session')?.('refresh', { query: 'hello' })
    expect(scope).toHaveBeenCalledWith('original-session')
    expect(send).toHaveBeenCalledWith('[rich-ui-action] {"action":"refresh","payload":{"query":"hello"}}')
    expect(actionHandler(context)).toBeUndefined()
    actionHandler(context, 'x')?.('a'.repeat(257))
    expect(send).toHaveBeenCalledTimes(1)
  })
})
