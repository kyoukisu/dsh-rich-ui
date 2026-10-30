import { describe, expect, it, vi } from "vitest";
import { createAutoRepair } from "./auto-repair";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("automatic repair guard", () => {
  it("sends one repair per document and never for streaming or oversize text", async () => {
    let clock = 1_000;
    const send = vi.fn().mockResolvedValue(undefined);
    const repair = createAutoRepair({ send, now: () => clock });

    expect(
      repair.consider({
        sessionId: "s",
        source: "{}",
        error: "Missing value",
        streaming: true,
      }),
    ).toBe(false);
    expect(
      repair.consider({
        sessionId: "s",
        source: '{"a":1}',
        error: "Document is longer than 256000 characters",
        streaming: false,
      }),
    ).toBe(false);
    expect(
      repair.consider({
        sessionId: "s",
        source: '{"b":2}',
        error: "Missing value",
        streaming: false,
      }),
    ).toBe(true);
    // Same document again, even with a different error, is ignored.
    expect(
      repair.consider({
        sessionId: "s",
        source: '{"b":2}',
        error: "Unknown field",
        streaming: false,
      }),
    ).toBe(false);
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0]).toContain("[rich-ui-repair]");
    expect(send.mock.calls[0]![0]).toContain('"automatic":true');
  });

  it("limits attempts per session per hour and keeps sessions independent", async () => {
    let clock = 0;
    const send = vi.fn().mockResolvedValue(undefined);
    const repair = createAutoRepair({ send, now: () => clock });
    const consider = (sessionId: string, source: string) =>
      repair.consider({
        sessionId,
        source,
        error: "Missing value",
        streaming: false,
      });

    expect(consider("a", "one")).toBe(true);
    expect(consider("a", "two")).toBe(true);
    expect(consider("a", "three")).toBe(false);
    expect(consider("b", "four")).toBe(true);

    clock += 60 * 60 * 1000 + 1;
    expect(consider("a", "five")).toBe(true);
    await flush();
    expect(send).toHaveBeenCalledTimes(4);
  });
});
