import { Avatar } from "./Avatar";
import { wallPosters, type Poster } from "../lib/posters";
import { formatCount } from "../lib/format";

const STRIP_SIZE = 36;

export function PosterWall({
  posters,
  selected,
  onSelect,
}: {
  posters: Poster[];
  selected: string | null;
  onSelect: (handle: string) => void;
}) {
  const ordered = wallPosters(posters);
  const shown = ordered.slice(0, STRIP_SIZE);
  const rest = ordered.length - shown.length;

  return (
    <div className="face-strip">
      <ul className="faces" aria-label="Named slop posters">
        {shown.map((poster) => {
          const pressed = selected?.toLowerCase() === poster.handle.toLowerCase();
          return (
            <li key={poster.id}>
              <button
                type="button"
                className={pressed ? "face is-selected" : "face"}
                aria-pressed={pressed}
                aria-label={`@${poster.handle}${poster.blockState === "blocked" ? ", blocked" : ""}`}
                title={`@${poster.handle}`}
                onClick={() => onSelect(poster.handle)}
              >
                <Avatar handle={poster.handle} displayName={poster.displayName} size={40} decorative />
              </button>
            </li>
          );
        })}
      </ul>
      {rest > 0 ? (
        <a className="face-more" href="#explorer">
          +{formatCount(rest)} more
        </a>
      ) : null}
    </div>
  );
}
