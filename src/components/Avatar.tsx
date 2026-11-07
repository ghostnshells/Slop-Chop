import { useEffect, useRef, useState, type CSSProperties } from "react";
import { acquireAvatarSlot, releaseAvatarSlot } from "../lib/avatarQueue";
import { avatarUrl } from "../lib/posters";

function hueFor(handle: string): number {
  let hue = 0;
  for (const char of handle.toLowerCase()) hue = (hue * 33 + char.charCodeAt(0)) % 360;
  return hue;
}

function initialFor(handle: string, displayName?: string | null): string {
  const source = `${displayName ?? ""} ${handle}`.replace(/[^A-Za-z0-9]/g, "");
  return source.slice(0, 1).toUpperCase() || "?";
}

export function Avatar({
  handle,
  displayName,
  size = 40,
  decorative = false,
}: {
  handle: string;
  displayName?: string | null;
  size?: number;
  decorative?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const holding = useRef(false);
  const label = displayName ? `${displayName} (@${handle})` : `@${handle}`;
  const initial = initialFor(handle, displayName);
  const hue = hueFor(handle);
  const sizeStyle = {
    "--avatar-size": `${size}px`,
    width: size,
    height: size,
  } as CSSProperties;

  useEffect(() => {
    let cancelled = false;
    holding.current = false;
    setSrc(null);
    setLoaded(false);

    acquireAvatarSlot().then(() => {
      if (cancelled) {
        releaseAvatarSlot();
        return;
      }
      holding.current = true;
      setSrc(avatarUrl(handle));
    });

    return () => {
      cancelled = true;
      if (holding.current) {
        holding.current = false;
        releaseAvatarSlot();
      }
    };
  }, [handle]);

  function releaseHold() {
    if (!holding.current) return;
    holding.current = false;
    releaseAvatarSlot();
  }

  return (
    <span className="avatar-wrap" style={sizeStyle}>
      {!loaded ? (
        <span
          className="avatar avatar-fallback"
          style={{ background: `hsl(${hue} 32% 26%)` }}
          aria-hidden={decorative}
          title={decorative ? undefined : label}
        >
          {initial}
        </span>
      ) : null}
      {src ? (
        <img
          className="avatar"
          src={src}
          alt={decorative ? "" : label}
          width={size}
          height={size}
          decoding="async"
          referrerPolicy="no-referrer"
          style={{ display: loaded ? "block" : "none" }}
          onLoad={() => {
            setLoaded(true);
            releaseHold();
          }}
          onError={() => {
            releaseHold();
          }}
        />
      ) : null}
    </span>
  );
}
