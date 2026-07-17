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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 w-full max-w-xs"
    >
      <input
        type="text"
        placeholder="Libellé"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoFocus
      />
      <input
        type="text"
        placeholder="Catégorie"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="number"
          min={5}
          step={5}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="w-20"
        />
        minutes
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isSpecialTime}
          onChange={(e) => setIsSpecialTime(e.target.checked)}
        />
        Horaire personnalisé
      </label>

      {isSpecialTime && (
        <input
          type="time"
          value={specialTime}
          onChange={(e) => setSpecialTime(e.target.value)}
        />
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <button type="submit">
          {initialEvent ? "Enregistrer" : "Ajouter"}
        </button>
        <button type="button" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}

export default EventForm;
