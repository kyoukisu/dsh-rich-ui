import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

/** Run after build:plugin: verifies actual fetched bytes, not just source transforms. */
describe.skipIf(!existsSync("lib/host/client.js"))(
  "DSH browser artifact protocol",
  () => {
    it("registers the exact module ID and executes with only the host React externals", async () => {
      let registration:
        | {
            id: string;
            factory: (
              require: (id: string) => unknown,
            ) => Record<string, unknown>;
          }
        | undefined;
      const append = { append: () => {} };
      runInNewContext(readFileSync("lib/host/client.js", "utf8"), {
        window: {
          __ModuleLoader__: {
            load: (value: typeof registration) => {
              registration = value;
            },
          },
        },
        document: { querySelector: () => true, head: append },
      });
      expect(registration?.id).toBe("@kyoukisu/dsh-rich-ui");
      const modules: Record<string, unknown> = {
        react: await import("react"),
        "react/jsx-runtime": await import("react/jsx-runtime"),
        "react-dom": await import("react-dom"),
        "react-dom/client": await import("react-dom/client"),
      };
      const client = registration!.factory((id) => {
        if (!(id in modules)) throw new Error(`Unseeded dependency: ${id}`);
        return modules[id];
      });
      expect(client.inject).toEqual(["sessions"]);
      expect(typeof client.apply).toBe("function");
    });
  },
);
