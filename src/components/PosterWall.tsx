import { Avatar } from "./Avatar";
import { wallPosters, type Poster } from "../lib/posters";

export function PosterWall({
  posters,
  selected,
  onSelect,
}: {
  posters: Poster[];
  selected: string | null;
  onSelect: (handle: string) => void;
}) {
  return (
    <ul className="poster-wall" aria-label="Named slop posters">
      {wallPosters(posters).map((poster) => {
        const pressed = selected?.toLowerCase() === poster.handle.toLowerCase();
        return (
          <li key={poster.id}>
            <button
              type="button"
              className={pressed ? "wall-face is-selected" : "wall-face"}
              aria-pressed={pressed}
              aria-label={`@${poster.handle}${poster.blockState === "blocked" ? ", blocked" : ""}`}
              onClick={() => onSelect(poster.handle)}
            >
              <Avatar handle={poster.handle} displayName={poster.displayName} size={44} decorative />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
