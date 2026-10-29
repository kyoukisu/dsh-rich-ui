import React, { useState } from "react";
import { ImageOff } from "lucide-react";

/** Image with a stable, accessible fallback. The caller owns sizing classes. */
export function Picture({
  src,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return failedSrc === src ? (
    <div
      className={`ru-image-fallback ${props.className ?? ""}`}
      role="img"
      aria-label={alt}
    >
      <ImageOff size={22} />
      <span>Изображение недоступно</span>
    </div>
  ) : (
    <img
      {...props}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}
