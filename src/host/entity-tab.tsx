import React from "react";
import type { Entity } from "../core/schema";
import { EntityDetails } from "../ui/EntityDetails";

export const ENTITY_TAB_KIND = "rich-ui-entity";
export const ENTITY_TAB_ID = "@kyoukisu/dsh-rich-ui/entity";

interface TabParams {
  entity?: Entity;
  entities?: Entity[];
}
interface TabInfo {
  tab: { navigation: { params?: TabParams } };
}
interface TabProps {
  useTabInfo?: () => TabInfo;
}

/** Structural faces of the host services; this plugin does not depend on their package types. */
export interface SidebarHost {
  inject?(
    names: string[],
    callback: (injected: { get(name: string): unknown }) => void,
  ): (() => void) | void;
  slots?: {
    inject(name: string, callback: () => () => void): () => void;
    register(
      options: {
        name: string;
        key: string;
        inject: (sessionId: string) => object;
      },
      component: React.ComponentType<Record<string, unknown>>,
    ): () => void;
  };
  sidebarRight?: {
    openTab(kind: string, options?: { params?: unknown }): void;
  };
}

/**
 * Put the entity into the native right column, which makes room for itself by
 * reflowing the conversation. Returns false when the host has no such column or
 * the open fails, so the caller can keep the in-page drawer.
 */
export function openEntityInSidebar(
  ctx: SidebarHost,
  entity: Entity,
  entities: Entity[],
): boolean {
  const sidebar = ctx.sidebarRight;
  if (!sidebar?.openTab) return false;
  try {
    sidebar.openTab(ENTITY_TAB_KIND, { params: { entity, entities } });
    return true;
  } catch {
    // No mounted session or a host-side refusal: keep the in-page drawer.
    return false;
  }
}

function paramsOf(info: TabInfo | undefined): TabParams | undefined {
  return info?.tab?.navigation?.params;
}

/** Body for a right-sidebar tab; the host delivers the live tab through `useTabInfo`. */
export function makeEntityTabBody(
  open: (entity: Entity, entities: Entity[]) => boolean,
) {
  return function EntityTabBody({ useTabInfo }: TabProps) {
    const params = paramsOf(useTabInfo?.());
    const entity = params?.entity;
    const entities = params?.entities ?? (entity ? [entity] : []);
    if (!entity || typeof entity.id !== "string" || !entity.title)
      return <p className="ru-empty">No entity data.</p>;
    return (
      <section
        className="rich-ui ru-entity-tab"
        data-rich-ui-entity-tab=""
        aria-label={`Details: ${entity.title}`}
      >
        <EntityDetails
          entity={entity}
          entities={entities}
          onSelect={(id) => {
            const next = entities.find((entry) => entry.id === id);
            if (next) open(next, entities);
          }}
        />
      </section>
    );
  };
}

/** Chip text for the same tab: the entity's own name, not a generic label. */
export function makeEntityTabTitle() {
  return function EntityTabTitle({ useTabInfo }: TabProps) {
    const entity = paramsOf(useTabInfo?.())?.entity;
    return <>{entity?.title ?? "Entity"}</>;
  };
}

/**
 * Register the tab type, its body and its chip title. The service appears after
 * this plugin's apply, so registration waits for it, exactly like the shipped
 * right-sidebar integrations.
 */
export function installEntityTab(
  ctx: SidebarHost,
  getSidebar?: () => SidebarHost["sidebarRight"],
): () => void {
  if (typeof ctx.inject !== "function" || !ctx.slots) return () => {};
  const slots = ctx.slots;
  let disposers: Array<() => void> = [];
  const cleanup = () => {
    for (const dispose of disposers) {
      try {
        dispose();
      } catch {
        /* A failing release must not mask the others. */
      }
    }
    disposers = [];
  };
  const seat = ctx.inject(["sidebarRightTabs"], (injected) => {
    const tabs = injected.get("sidebarRightTabs") as
      { register?: (definition: object) => () => void } | undefined;
    if (!tabs?.register) return;
    cleanup();
    const body = makeEntityTabBody((entity, entities) =>
      openEntityInSidebar({ sidebarRight: getSidebar?.() }, entity, entities),
    );
    const title = makeEntityTabTitle();
    try {
      disposers.push(
        tabs.register({
          id: ENTITY_TAB_ID,
          kind: ENTITY_TAB_KIND,
          keepMounted: true,
          title: () => "Entity",
        }),
      );
      disposers.push(
        slots.inject("sidebar.right.pane.tab", () =>
          slots.register(
            {
              name: "sidebar.right.pane.tab",
              key: ENTITY_TAB_ID,
              inject: (sessionId) => ({ sessionId }),
            },
            body,
          ),
        ),
      );
      disposers.push(
        slots.inject("sidebar.right.pane.tab.title", () =>
          slots.register(
            {
              name: "sidebar.right.pane.tab.title",
              key: ENTITY_TAB_ID,
              inject: (sessionId) => ({ sessionId }),
            },
            title,
          ),
        ),
      );
    } catch {
      cleanup();
    }
  });
  return () => {
    seat?.();
    cleanup();
  };
}
