import { vi } from 'vitest'

export type Call = { url: string; method: string; body: unknown; headers: Headers }
type Reply = { status?: number; body?: unknown }
type Handler = (call: Call) => Reply | undefined

/**
 * Sustituye `fetch` por un doble que registra las llamadas y responde con lo que decida `handler`.
 * Devuelve `calls` para poder comprobar qué ruta, método y cuerpo envió el frontend.
 */
export function mockFetch(handler: Handler) {
  const calls: Call[] = []
  const fake = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      headers: new Headers(init?.headers),
    }
    calls.push(call)
    const reply = handler(call) ?? { status: 200, body: {} }
    const status = reply.status ?? 200
    return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(reply.body ?? {}), {
      status, headers: { 'Content-Type': 'application/json' },
    }))
  })
  vi.stubGlobal('fetch', fake)
  return calls
}
