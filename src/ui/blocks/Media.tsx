import React from "react";
import type { AudioNode, VideoNode } from "../../core/schema";

/** Direct media files only: https URLs validated by the schema, no autoplay,
 * no tracking scripts and no third-party embed frames. */
export function Video({ node }: { node: VideoNode }) {
  return (
    <figure className="ru-media">
      <video
        className="ru-media-video"
        src={node.src}
        poster={node.poster}
        controls
        preload="metadata"
        playsInline
      />
      {(node.title || node.caption) && (
        <figcaption>
          {node.title ? <strong>{node.title}</strong> : null}
          {node.caption ? <span>{node.caption}</span> : null}
        </figcaption>
      )}
    </figure>
  );
}

export function Audio({ node }: { node: AudioNode }) {
  return (
    <figure className="ru-media ru-media-audio">
      <audio className="ru-media-audio-player" src={node.src} controls preload="metadata" />
      {(node.title || node.caption) && (
        <figcaption>
          {node.title ? <strong>{node.title}</strong> : null}
          {node.caption ? <span>{node.caption}</span> : null}
        </figcaption>
      )}
    </figure>
  );
}
