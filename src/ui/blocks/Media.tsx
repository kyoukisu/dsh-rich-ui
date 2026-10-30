import React, { useState } from "react";
import type { AudioNode, VideoNode } from "../../core/schema";

function Caption({ title, caption }: { title?: string; caption?: string }) {
  if (!title && !caption) return null;
  return (
    <figcaption>
      {title ? <strong>{title}</strong> : null}
      {caption ? <span>{caption}</span> : null}
    </figcaption>
  );
}

function Unavailable({
  kind,
  src,
  title,
  caption,
}: {
  kind: string;
  src: string;
  title?: string;
  caption?: string;
}) {
  return (
    <figure className="ru-media">
      <div className="ru-media-fallback" role="alert">
        <span>{kind} unavailable.</span>
        <a href={src} target="_blank" rel="noopener noreferrer">
          Open the file
        </a>
      </div>
      <Caption title={title} caption={caption} />
    </figure>
  );
}

/** Direct media files only: https URLs validated by the schema, no autoplay,
 * no tracking scripts and no third-party embed frames. A failed source keeps a
 * link instead of leaving an unexplained blank player. */
export function Video({ node }: { node: VideoNode }) {
  // A new source deserves a fresh attempt; a boolean latch would keep the old
  // failure forever when a corrected document reuses this position.
  const [failedSrc, setFailedSrc] = useState<string>();
  const label = node.title ?? node.caption ?? "Video";
  if (failedSrc === node.src)
    return (
      <Unavailable
        kind="Video"
        src={node.src}
        title={node.title}
        caption={node.caption}
      />
    );
  return (
    <figure className="ru-media">
      <video
        className="ru-media-video"
        src={node.src}
        poster={node.poster}
        controls
        preload="metadata"
        playsInline
        aria-label={label}
        onError={() => setFailedSrc(node.src)}
      />
      <Caption title={node.title} caption={node.caption} />
    </figure>
  );
}

export function Audio({ node }: { node: AudioNode }) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const label = node.title ?? node.caption ?? "Audio";
  if (failedSrc === node.src)
    return (
      <Unavailable
        kind="Audio"
        src={node.src}
        title={node.title}
        caption={node.caption}
      />
    );
  return (
    <figure className="ru-media ru-media-audio">
      <audio
        className="ru-media-audio-player"
        src={node.src}
        controls
        preload="metadata"
        aria-label={label}
        onError={() => setFailedSrc(node.src)}
      />
      <Caption title={node.title} caption={node.caption} />
    </figure>
  );
}
