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
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {formatMinutes(event.startMinutes)}
          </span>
          {event.specialStartMinutes != null && (
            <span className="text-[8px] font-medium text-white/90 leading-none mt-0.5">
              Horaire fixe
            </span>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center text-white/80 text-xs font-medium">
          {formatMinutes(event.durationMinutes)}
        </div>
      </div>

      <div className="relative flex-1 px-3 py-2 flex flex-col justify-center gap-1 min-w-0 bg-neutral-800">
        {event.category && (
          <span
            className="absolute top-2 right-2 text-[10px] text-white rounded px-1.5 py-0.5"
            style={{ backgroundColor: from }}
          >
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
