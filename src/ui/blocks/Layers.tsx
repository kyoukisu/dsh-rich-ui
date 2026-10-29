import React from "react";
import { ArrowDown } from "lucide-react";
import type { Layer, LayersNode } from "../../core/schema";
import { resolveIcon } from "../icons";

/** One box in the stack: a title line, optional members, optional nested boxes. */
function LayerCard({ layer, depth }: { layer: Layer; depth: number }) {
  const Glyph = layer.icon ? resolveIcon(layer.icon) : undefined;
  return (
    <div
      className="ru-layer"
      data-depth={depth}
      data-tone={layer.tone ?? "default"}
    >
      <div className="ru-layer-head">
        {Glyph ? <Glyph size={16} aria-hidden="true" /> : null}
        <div className="ru-layer-labels">
          <strong>{layer.title}</strong>
          {layer.detail ? (
            <span className="ru-layer-detail">{layer.detail}</span>
          ) : null}
        </div>
      </div>
      {layer.items?.length ? (
        <ul className="ru-layer-items">
          {layer.items.map((item) => {
            const ItemGlyph = item.icon ? resolveIcon(item.icon) : undefined;
            return (
              <li key={item.label} data-tone={item.tone ?? "default"}>
                {ItemGlyph ? <ItemGlyph size={15} aria-hidden="true" /> : null}
                <span>{item.label}</span>
                {item.detail ? <small>{item.detail}</small> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {layer.layers?.length ? (
        <div className="ru-layer-inner">
          {layer.layers.map((child, index) => (
            <React.Fragment key={`${child.title}-${index}`}>
              {index > 0 ? (
                <span className="ru-layer-arrow" aria-hidden="true">
                  <ArrowDown size={14} />
                </span>
              ) : null}
              <LayerCard layer={child} depth={depth + 1} />
            </React.Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Stacked architecture: boxes inside boxes, with members drawn as small chips. */
export function Layers({ node }: { node: LayersNode }) {
  return (
    <figure className="ru-layers">
      <div className="ru-layers-stack">
        {node.layers.map((layer, index) => (
          <React.Fragment key={`${layer.title}-${index}`}>
            {index > 0 ? (
              <span className="ru-layers-arrow" aria-hidden="true">
                <ArrowDown size={16} />
              </span>
            ) : null}
            <LayerCard layer={layer} depth={0} />
          </React.Fragment>
        ))}
      </div>
      {node.caption ? <figcaption>{node.caption}</figcaption> : null}
    </figure>
  );
}
