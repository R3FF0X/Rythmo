import type { Event } from "./types";
import { formatMinutes } from "./types";
import { getCategoryColor } from "./categoryColors";

type Props = {
  event: Event;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
};

function EventCard({ event, onDelete, onEdit }: Props) {
  const { base, tint } = getCategoryColor(event.category);

  return (
    <div
      onClick={() => onEdit(event.id)}
      className="flex bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden cursor-pointer"
    >
      <div className="w-20 flex flex-col flex-shrink-0">
        <div
          className="flex-1 flex items-center justify-center text-white font-semibold text-sm"
          style={{ backgroundColor: base }}
        >
          {formatMinutes(event.startMinutes)}
        </div>
        <div
          className="flex-1 flex items-center justify-center text-white/85 text-xs font-medium"
          style={{ backgroundColor: tint }}
        >
          {formatMinutes(event.durationMinutes)}
        </div>
      </div>

      <div className="flex-1 px-3 py-2 flex flex-col justify-center gap-1 min-w-0">
        {event.category && (
          <span className="self-start text-[10px] text-neutral-400 bg-white/5 border border-neutral-800 rounded px-1.5 py-0.5">
            {event.category}
          </span>
        )}
        <span className="text-white text-sm font-medium truncate">
          {event.label}
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(event.id);
        }}
        className="w-9 flex-shrink-0 flex items-center justify-center text-neutral-500 hover:text-white border-l border-neutral-800"
      >
        ✕
      </button>
    </div>
  );
}

export default EventCard;
