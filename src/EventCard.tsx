import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ScheduledEvent } from "./types";
import EventCardVisual from "./EventCardVisual";

type Props = {
  event: ScheduledEvent;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onResize: (id: string, durationMinutes: number) => void;
  onInsertAfter: () => void;
  isDragging: boolean;
  onDragStart: (id: string, rect: DOMRect, pointerY: number) => void;
  onDragMove: (pointerY: number) => void;
  onDragEnd: () => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
};

const MIN_HEIGHT = 96;
const PX_PER_MINUTE = 2.2;
const LONG_PRESS_MS = 450;
const MOVE_CANCEL_THRESHOLD = 8;
const RESIZE_MIN_DURATION = 5;

function EventCard({
  event,
  onDelete,
  onEdit,
  onResize,
  onInsertAfter,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  registerRef,
}: Props) {
  const height = Math.max(MIN_HEIGHT, event.durationMinutes * PX_PER_MINUTE);

  const cardElRef = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const didDragRef = useRef(false);
  const draggingActive = useRef(false);

  const resizeStartY = useRef(0);
  const resizeStartDuration = useRef(0);
  const resizingActive = useRef(false);
  const didResizeRef = useRef(false);

  // toujours appeler la dernière version des callbacks depuis les listeners attachés à window
  const onDragMoveRef = useRef(onDragMove);
  onDragMoveRef.current = onDragMove;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  function clearLongPressTimer() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleWindowPointerMove(e: PointerEvent) {
    if (!draggingActive.current) return;
    onDragMoveRef.current(e.clientY);
  }

  function handleWindowPointerUp() {
    draggingActive.current = false;
    onDragEndRef.current();
    window.removeEventListener("pointermove", handleWindowPointerMove);
    window.removeEventListener("pointerup", handleWindowPointerUp);
    window.setTimeout(() => {
      didDragRef.current = false;
    }, 0);
  }

  function beginDrag() {
    if (!cardElRef.current || !pressStart.current) return;
    draggingActive.current = true;
    didDragRef.current = true;
    onDragStart(
      event.id,
      cardElRef.current.getBoundingClientRect(),
      pressStart.current.y,
    );
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
  }

  function handleCardPointerDown(e: ReactPointerEvent) {
    pressStart.current = { x: e.clientX, y: e.clientY };
    clearLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      beginDrag();
    }, LONG_PRESS_MS);
  }

  function handleCardPointerMove(e: ReactPointerEvent) {
    if (!pressStart.current || draggingActive.current) return;
    const dx = e.clientX - pressStart.current.x;
    const dy = e.clientY - pressStart.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > MOVE_CANCEL_THRESHOLD) {
      clearLongPressTimer();
    }
  }

  function handleCardPointerUp() {
    clearLongPressTimer();
    pressStart.current = null;
  }

  function handleHandlePointerDown(e: ReactPointerEvent) {
    e.stopPropagation();
    pressStart.current = { x: e.clientX, y: e.clientY };
    beginDrag();
  }

  function handleClick() {
    if (didDragRef.current || didResizeRef.current) return;
    onEdit(event.id);
  }

  function handleResizeWindowPointerMove(e: PointerEvent) {
    if (!resizingActive.current) return;
    const deltaY = e.clientY - resizeStartY.current;
    const deltaMinutes = Math.round(deltaY / PX_PER_MINUTE / 5) * 5;
    const newDuration = Math.max(
      RESIZE_MIN_DURATION,
      resizeStartDuration.current + deltaMinutes,
    );
    onResizeRef.current(event.id, newDuration);
  }

  function handleResizeWindowPointerUp() {
    resizingActive.current = false;
    window.removeEventListener("pointermove", handleResizeWindowPointerMove);
    window.removeEventListener("pointerup", handleResizeWindowPointerUp);
    window.setTimeout(() => {
      didResizeRef.current = false;
    }, 0);
  }

  function handleResizePointerDown(e: ReactPointerEvent) {
    e.stopPropagation();
    resizeStartY.current = e.clientY;
    resizeStartDuration.current = event.durationMinutes;
    resizingActive.current = true;
    didResizeRef.current = true;
    window.addEventListener("pointermove", handleResizeWindowPointerMove);
    window.addEventListener("pointerup", handleResizeWindowPointerUp);
  }

  return (
    <div
      ref={(el) => {
        cardElRef.current = el;
        registerRef(event.id, el);
      }}
      onPointerDown={handleCardPointerDown}
      onPointerMove={handleCardPointerMove}
      onPointerUp={handleCardPointerUp}
      onClick={handleClick}
      className={`relative flex rounded-2xl overflow-hidden select-none ${
        isDragging
          ? "opacity-40 border-2 border-dashed border-neutral-600 bg-transparent"
          : "shadow-lg cursor-pointer"
      }`}
      style={{ height, touchAction: isDragging ? "none" : "pan-y" }}
    >
      {!isDragging && (
        <>
          <EventCardVisual event={event} />
          <div className="flex flex-col flex-shrink-0 h-full bg-neutral-900 border-l border-neutral-700">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event.id);
              }}
              className="flex-1 min-h-0 w-9 flex items-center justify-center text-neutral-500 hover:text-white text-base leading-none active:scale-90 transition-transform duration-100"
            >
              ✕
            </button>
            <div
              onPointerDown={handleHandlePointerDown}
              className="flex-1 min-h-0 w-9 flex items-center justify-center text-neutral-500 hover:text-white cursor-grab active:cursor-grabbing touch-none text-base leading-none"
            >
              ☰
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onInsertAfter();
              }}
              className="flex-1 min-h-0 w-9 flex items-center justify-center text-neutral-500 hover:text-white text-lg leading-none active:scale-90 transition-transform duration-100"
            >
              +
            </button>
          </div>

          <div
            onPointerDown={handleResizePointerDown}
            className="absolute bottom-0 left-0 right-9 h-2.5 cursor-row-resize touch-none flex items-center justify-center"
          >
            <div className="w-8 h-1 rounded-full bg-neutral-600" />
          </div>
        </>
      )}
    </div>
  );
}

export default EventCard;
