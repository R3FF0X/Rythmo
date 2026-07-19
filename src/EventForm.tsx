import { useState } from "react";
import type { FormEvent } from "react";
import type { Event } from "./types";

type Props = {
  initialEvent?: Event;
  onSubmit: (event: Omit<Event, "id">) => string | null;
  onCancel: () => void;
};

function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

const fieldClass =
  "w-full bg-neutral-800 border-none rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/30";

type DurationMode = "minutes" | "hm";

type SwitchProps = {
  mode: DurationMode;
  onToggle: () => void;
};

function DurationModeSwitch({ mode, onToggle }: SwitchProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative w-20 h-9 rounded-lg bg-neutral-900 border border-neutral-700 p-1 flex-shrink-0 active:scale-95 transition-transform duration-100"
    >
      <span
        className="absolute top-1 left-1 w-9 h-7 rounded-md bg-orange-600 transition-transform duration-200 ease-out"
        style={{ transform: mode === "hm" ? "translateX(2.25rem)" : "translateX(0)" }}
      />
      <span className="relative z-10 grid grid-cols-2 h-full text-[11px] font-semibold">
        <span
          className={`flex items-center justify-center transition-colors ${mode === "minutes" ? "text-white" : "text-neutral-500"}`}
        >
          min
        </span>
        <span
          className={`flex items-center justify-center transition-colors ${mode === "hm" ? "text-white" : "text-neutral-500"}`}
        >
          h:m
        </span>
      </span>
    </button>
  );
}

function EventForm({ initialEvent, onSubmit, onCancel }: Props) {
  const [label, setLabel] = useState(initialEvent?.label ?? "");
  const [category, setCategory] = useState(initialEvent?.category ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    initialEvent?.durationMinutes ?? 30,
  );
  const [durationMode, setDurationMode] = useState<DurationMode>("minutes");
  const [isSpecialTime, setIsSpecialTime] = useState(
    initialEvent?.specialStartMinutes != null,
  );
  const [specialTime, setSpecialTime] = useState(
    initialEvent?.specialStartMinutes != null
      ? minutesToTimeString(initialEvent.specialStartMinutes)
      : "09:00",
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;

    const result = onSubmit({
      label,
      category,
      durationMinutes,
      specialStartMinutes: isSpecialTime
        ? timeStringToMinutes(specialTime)
        : null,
    });

    setError(result);
  }

  const durationHours = Math.floor(durationMinutes / 60);
  const durationRemainderMinutes = durationMinutes % 60;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <input
        type="text"
        placeholder="Libellé"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoFocus
        className={fieldClass}
      />
      <input
        type="text"
        placeholder="Catégorie"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={fieldClass}
      />

      <div className="flex items-center gap-2">
        <div
          className={`flex-1 text-center rounded-xl px-2 py-3 text-xs font-medium transition-colors ${
            durationMode === "minutes"
              ? "bg-neutral-800 text-white"
              : "bg-neutral-800/40 text-neutral-600"
          }`}
        >
          Minutes
        </div>

        <DurationModeSwitch
          mode={durationMode}
          onToggle={() =>
            setDurationMode((mode) => (mode === "minutes" ? "hm" : "minutes"))
          }
        />

        <div
          className={`flex-1 text-center rounded-xl px-2 py-3 text-xs font-medium transition-colors ${
            durationMode === "hm"
              ? "bg-neutral-800 text-white"
              : "bg-neutral-800/40 text-neutral-600"
          }`}
        >
          H : min
        </div>
      </div>

      <div className="flex items-center justify-center bg-neutral-800 rounded-xl px-4 py-3">
        {durationMode === "minutes" ? (
          <input
            type="number"
            min={5}
            step={5}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="w-20 bg-transparent border-none text-white text-center text-lg focus:outline-none"
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={durationHours}
              onChange={(e) =>
                setDurationMinutes(
                  Number(e.target.value) * 60 + durationRemainderMinutes,
                )
              }
              className="w-12 bg-transparent border-none text-white text-center text-lg focus:outline-none"
            />
            <span className="text-neutral-400 text-sm">h</span>
            <input
              type="number"
              min={0}
              max={55}
              step={5}
              value={durationRemainderMinutes}
              onChange={(e) =>
                setDurationMinutes(
                  durationHours * 60 + Number(e.target.value),
                )
              }
              className="w-12 bg-transparent border-none text-white text-center text-lg focus:outline-none"
            />
            <span className="text-neutral-400 text-sm">min</span>
          </div>
        )}
      </div>

      <label className="flex items-center justify-between bg-neutral-800 rounded-xl px-4 py-3 cursor-pointer">
        <span className="text-neutral-300 text-sm">Horaire personnalisé</span>
        <input
          type="checkbox"
          checked={isSpecialTime}
          onChange={(e) => setIsSpecialTime(e.target.checked)}
          className="w-4 h-4 accent-white"
        />
      </label>

      {isSpecialTime && (
        <input
          type="time"
          value={specialTime}
          onChange={(e) => setSpecialTime(e.target.value)}
          className={fieldClass}
        />
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl border border-neutral-700 text-neutral-300 font-medium active:scale-95 transition-transform duration-100"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="flex-1 py-3 rounded-xl bg-white text-black font-semibold active:scale-95 transition-transform duration-100"
        >
          {initialEvent ? "Enregistrer" : "Ajouter"}
        </button>
      </div>
    </form>
  );
}

export default EventForm;
