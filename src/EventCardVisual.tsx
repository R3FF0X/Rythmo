import type { ScheduledEvent } from "./types";
import { formatMinutes } from "./types";
import { getCategoryColor } from "./categoryColors";

type Props = {
  event: ScheduledEvent;
};

function EventCardVisual({ event }: Props) {
  const { from, to } = getCategoryColor(event.category);

  return (
    <>
      <div
        className="relative w-20 flex flex-col flex-shrink-0"
        style={{ background: `linear-gradient(180deg, ${from}, ${to})` }}
      >
        {event.specialStartMinutes != null && (
          <span className="absolute top-1 left-1 text-[8px] font-medium text-white/90 leading-none">
            Horaire fixe
          </span>
        )}
        <div className="flex-1 flex items-center justify-center text-white font-semibold text-sm">
          {formatMinutes(event.startMinutes)}
        </div>
        <div className="flex-1 flex items-center justify-center text-white/80 text-xs font-medium">
          {formatMinutes(event.durationMinutes)}
        </div>
      </div>

      <div className="relative flex-1 px-3 py-2 flex flex-col justify-center gap-1 min-w-0 bg-neutral-800">
        {event.category && (
          <span className="absolute top-2 right-2 text-[10px] text-neutral-300 bg-white/10 border border-neutral-700 rounded px-1.5 py-0.5">
            {event.category}
          </span>
        )}
        <span className="text-white text-sm font-medium truncate pr-14">
          {event.label}
        </span>
      </div>
    </>
  );
}

export default EventCardVisual;
