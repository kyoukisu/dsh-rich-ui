// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ENTITY_TAB_ID,
  ENTITY_TAB_KIND,
  installEntityTab,
  makeEntityTabBody,
  openEntityInSidebar,
} from "../../src/host/entity-tab";
import type { Entity } from "../../src/core/schema";

const one: Entity = {
  id: "one",
  kind: "Film",
  title: "One",
  description: "First entity",
  related: ["two"],
};
const two: Entity = { id: "two", kind: "Film", title: "Two" };

let host: HTMLDivElement;
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
});
afterEach(() => {
  host.remove();
});

describe("native entity tab", () => {
  it("opens the entity in the right column with both params", () => {
    const openTab = vi.fn();
    expect(
      openEntityInSidebar({ sidebarRight: { openTab } }, one, [one, two]),
    ).toBe(true);
    expect(openTab).toHaveBeenCalledWith(ENTITY_TAB_KIND, {
      params: { entity: one, entities: [one, two] },
    });
  });

  it("declines without a column and when the host throws", () => {
    expect(openEntityInSidebar({}, one, [one])).toBe(false);
    expect(
      openEntityInSidebar(
        {
          sidebarRight: {
            openTab: () => {
              throw new Error("no session");
            },
          },
        },
        one,
        [one],
      ),
    ).toBe(false);
  });

  it("registers the type, body and title, then releases them", () => {
    const releaseType = vi.fn();
    const releaseBody = vi.fn();
    const releaseTitle = vi.fn();
    const register = vi.fn(() => releaseType);
    const slotInject = vi.fn((_name: string, callback: () => () => void) =>
      callback(),
    );
    const slotRegister = vi
      .fn()
      .mockReturnValueOnce(releaseBody)
      .mockReturnValueOnce(releaseTitle);
    const disposeSeat = vi.fn();
    const ctx = {
      inject: vi.fn(
        (
          _names: string[],
          callback: (injected: { get(name: string): unknown }) => void,
        ) => {
          callback({ get: () => ({ register }) });
          return disposeSeat;
        },
      ),
      slots: { inject: slotInject, register: slotRegister },
    };
    const dispose = installEntityTab(ctx as never);
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ id: ENTITY_TAB_ID, kind: ENTITY_TAB_KIND }),
    );
    expect(slotRegister).toHaveBeenCalledTimes(2);
    expect(slotRegister.mock.calls[0]![0]).toMatchObject({
      name: "sidebar.right.pane.tab",
      key: ENTITY_TAB_ID,
    });
    expect(slotRegister.mock.calls[1]![0]).toMatchObject({
      name: "sidebar.right.pane.tab.title",
      key: ENTITY_TAB_ID,
    });
    dispose();
    expect(disposeSeat).toHaveBeenCalled();
    expect(releaseType).toHaveBeenCalled();
    expect(releaseBody).toHaveBeenCalled();
    expect(releaseTitle).toHaveBeenCalled();
  });

  it("renders the shared details and follows related entities in the same tab", async () => {
    const open = vi.fn(() => true);
    const Body = makeEntityTabBody(open);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <Body
          useTabInfo={() => ({
            tab: {
              navigation: { params: { entity: one, entities: [one, two] } },
            },
          })}
        />,
      );
    });
    expect(host.textContent).toContain("One");
    expect(host.textContent).toContain("First entity");
    const related = [...host.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Two"),
    )!;
    await act(async () => {
      related.click();
    });
    expect(open).toHaveBeenCalledWith(two, [one, two]);
    await act(async () => root.unmount());
  });
});
