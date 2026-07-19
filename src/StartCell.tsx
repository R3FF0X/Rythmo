import { formatMinutes } from "./types";

type Props = {
  startMinutes: number;
  onEdit: () => void;
  onInsertAfter: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
};

const HEIGHT = 76;

function StartCell({ startMinutes, onEdit, onInsertAfter, registerRef }: Props) {
  return (
    <div
      ref={registerRef}
      className="relative flex rounded-2xl overflow-hidden shadow-lg select-none"
      style={{ height: HEIGHT }}
    >
      <button
        onClick={onEdit}
        className="w-20 flex-shrink-0 flex items-center justify-center text-white font-semibold text-sm active:scale-95 transition-transform duration-100"
        style={{ background: "linear-gradient(180deg, #52525b, #27272a)" }}
      >
        {formatMinutes(startMinutes)}
      </button>

      <button
        onClick={onEdit}
        className="flex-1 px-3 py-2 flex flex-col justify-center gap-1 min-w-0 bg-neutral-800 text-left active:scale-[0.99] transition-transform duration-100"
      >
        <span className="text-white text-sm font-medium">Début</span>
        <span className="text-neutral-500 text-[10px]">
          Touchez pour modifier l'heure
        </span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onInsertAfter();
        }}
        className="w-9 flex-shrink-0 h-full bg-neutral-900 border-l border-neutral-700 flex items-center justify-center text-neutral-500 hover:text-white text-lg leading-none active:scale-90 transition-transform duration-100"
      >
        +
      </button>
    </div>
  );
}

export default StartCell;
