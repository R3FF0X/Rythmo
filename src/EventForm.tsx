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

function EventForm({ initialEvent, onSubmit, onCancel }: Props) {
  const [label, setLabel] = useState(initialEvent?.label ?? "");
  const [category, setCategory] = useState(initialEvent?.category ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    initialEvent?.durationMinutes ?? 30,
  );
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

      <div className="flex items-center justify-between bg-neutral-800 rounded-xl px-4 py-3">
        <span className="text-neutral-300 text-sm">Durée (minutes)</span>
        <input
          type="number"
          min={5}
          step={5}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="w-16 bg-transparent border-none text-white text-right focus:outline-none"
        />
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
