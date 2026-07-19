import { useState } from "react";
import Modal from "./Modal";

type Props = {
  currentMinutes: number;
  onSave: (minutes: number) => void;
  onCancel: () => void;
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

// arrondit au multiple de 5 le plus proche pour toujours correspondre à une option du sélecteur
function roundToStep(minutes: number): string {
  let rounded = Math.round(minutes / 5) * 5;
  if (rounded >= 24 * 60) rounded = 0;
  if (rounded === EXCLUDED_MINUTES) rounded -= 5;
  return minutesToTimeString(rounded);
}

function EditStartTimeModal({ currentMinutes, onSave, onCancel }: Props) {
  const [time, setTime] = useState(roundToStep(currentMinutes));

  return (
    <Modal onClose={onCancel}>
      {(close) => (
        <>
          <h2 className="text-white text-base font-semibold mb-3">
            Heure de début
          </h2>

          <div className="flex flex-col gap-3">
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl bg-neutral-800 border-none text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setTime(roundToStep(nowMinutes()))}
              className="text-neutral-400 text-sm underline decoration-dotted self-center active:scale-95 transition-transform duration-100"
            >
              Utiliser l'heure actuelle
            </button>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={close}
                className="flex-1 py-3 rounded-xl border border-neutral-700 text-neutral-300 font-medium active:scale-95 transition-transform duration-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave(timeStringToMinutes(time));
                  close();
                }}
                className="flex-1 py-3 rounded-xl bg-white text-black font-semibold active:scale-95 transition-transform duration-100"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

export default EditStartTimeModal;
