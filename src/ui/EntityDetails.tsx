import React, { useEffect, useId, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, ExternalLink } from "lucide-react";
import type { Entity } from "../core/schema";
import { formatNumber } from "./blocks/Metrics";
import { Picture } from "./Picture";

export interface EntityDetailsProps {
  entity: Entity;
  entities: Entity[];
  onSelect: (id: string) => void;
  titleId?: string;
  titleRef?: React.Ref<HTMLHeadingElement>;
}

/**
 * The body of an entity detail surface, shared by the in-page drawer and the
 * native right-sidebar tab. Chrome, focus handling and portals stay with the
 * host shell, so both surfaces show the same facts, gallery and sources.
 */
export function EntityDetails({
  entity,
  entities,
  onSelect,
  titleId,
  titleRef,
}: EntityDetailsProps) {
  const [photo, setPhoto] = useState(0);
  const fallbackId = useId();
  const id = titleId ?? fallbackId;
  useEffect(() => setPhoto(0), [entity.id]);
  const images = entity.images?.length
    ? entity.images
    : entity.image
      ? [entity.image]
      : [];
  const related = (entity.related ?? [])
    .map((entry) => entities.find((candidate) => candidate.id === entry))
    .filter((entry): entry is Entity => Boolean(entry));
  return (
    <>
      {images.length > 0 && (
        <div className="ru-detail-gallery">
          <Picture
            key={images[photo]}
            src={images[photo]!}
            alt={`${entity.title} — image ${photo + 1}`}
            className="ru-detail-photo"
          />
          {images.length > 1 && (
            <div className="ru-thumbs">
              {images.map((source, index) => (
                <button
                  key={source}
                  type="button"
                  aria-label={`Image ${index + 1}`}
                  aria-pressed={photo === index}
                  onClick={() => setPhoto(index)}
                >
                  <Picture src={source} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="ru-detail-body">
        <h2 id={id} ref={titleRef} tabIndex={-1}>
          {entity.title}
        </h2>
        {entity.subtitle && (
          <p className="ru-detail-subtitle">{entity.subtitle}</p>
        )}
        {entity.description && <p>{entity.description}</p>}
        {entity.badge && (
          <span
            className="ru-entity-badge ru-detail-badge"
            data-tone={entity.badge.tone ?? "success"}
          >
            <Check size={13} aria-hidden="true" />
            {entity.badge.label}
          </span>
        )}
        {entity.facts?.length ? (
          <dl className="ru-facts">
            {entity.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>
                  {typeof fact.value === "number"
                    ? formatNumber(fact.value)
                    : String(fact.value ?? "—")}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {entity.sources?.length ? (
          <div className="ru-detail-actions">
            <a
              className="ru-button ru-button-primary"
              href={entity.sources[0]!.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open source
              <ArrowUpRight size={15} />
            </a>
          </div>
        ) : null}
        {entity.sources?.length ? (
          <section>
            <h3 className="ru-section-title">Sources</h3>
            {entity.sources.map((source) => (
              <a
                className="ru-source"
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                key={source.url}
              >
                <ExternalLink size={15} aria-hidden="true" />
                <span>
                  {source.title}
                  <small>{new URL(source.url).hostname}</small>
                </span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            ))}
          </section>
        ) : null}
        {related.length > 0 && (
          <section>
            <h3 className="ru-section-title">Related</h3>
            {related.map((entry) => (
              <button
                type="button"
                className="ru-related"
                key={entry.id}
                onClick={() => onSelect(entry.id)}
              >
                {entry.title}
                <ChevronRight size={16} />
              </button>
            ))}
          </section>
        )}
        <p className="ru-provenance">
          All details come from the listed sources. Demo data is not a live
          offer.
        </p>
      </div>
    </>
  );
}
