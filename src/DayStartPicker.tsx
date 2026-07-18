import { useState } from "react";

type Props = {
  onSelect: (minutes: number) => void;
};

function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const EXCLUDED_MINUTES = 23 * 60 + 55; // 23h55 exclu (la journée finit toujours à 23h59)

function buildTimeOptions(): string[] {
  const options: string[] = [];
  for (let m = 0; m < 24 * 60; m += 5) {
    if (m === EXCLUDED_MINUTES) continue;
    options.push(minutesToTimeString(m));
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

const BUTTON_TAP = "active:scale-95 transition-transform duration-100";

function DayStartPicker({ onSelect }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customTime, setCustomTime] = useState("09:00");

  return (
    <div className="flex flex-col items-center gap-5 max-w-xs w-full">
      <p className="text-white text-center text-base">
        À quelle heure commence la journée ?
      </p>

      {!showCustom && (
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={() => onSelect(nowMinutes())}
            className={`w-full py-2.5 rounded-lg bg-white text-black font-medium ${BUTTON_TAP}`}
          >
            Maintenant
          </button>
          <button
            onClick={() => setShowCustom(true)}
            className={`w-full py-2.5 rounded-lg border border-neutral-700 text-white ${BUTTON_TAP}`}
          >
            Personnaliser
          </button>
        </div>
      )}

      {showCustom && (
        <div className="flex flex-col gap-2 w-full">
          <select
            value={customTime}
            onChange={(e) => setCustomTime(e.target.value)}
            className="w-full py-2.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={() => onSelect(timeStringToMinutes(customTime))}
            className={`w-full py-2.5 rounded-lg bg-white text-black font-medium ${BUTTON_TAP}`}
          >
            Valider
          </button>
        </div>
      )}
    </div>
  );
}

export default DayStartPicker;
