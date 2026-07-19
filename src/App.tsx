import { useState, useEffect, useRef, useLayoutEffect } from "react";
import type { Event } from "./types";
import {
  computeSchedule,
  hasSpecialConflict,
  formatEndLabel,
} from "./types";
import EventForm from "./EventForm";
import EventCard from "./EventCard";
import EventCardVisual from "./EventCardVisual";
import StartCell from "./StartCell";
import EditStartTimeModal from "./EditStartTimeModal";
import Modal from "./Modal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import ConfirmClearAllModal from "./ConfirmClearAllModal";
import TrashIcon from "./TrashIcon";
import CalendarLogo from "./CalendarLogo";
import { requestNotificationPermission, rescheduleNotifications } from "./notifications";

const STORAGE_KEY = "rythmo-events";
const DAY_START_KEY = "rythmo-day-start";
const SWAP_THRESHOLD_RATIO = 0.6;

function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function loadInitialState(): { events: Event[]; dayStartMinutes: number } {
  const rawEvents = localStorage.getItem(STORAGE_KEY);
  const rawDayStart = localStorage.getItem(DAY_START_KEY);
  return {
    events: rawEvents ? JSON.parse(rawEvents) : [],
    dayStartMinutes: rawDayStart ? Number(rawDayStart) : nowMinutes(),
  };
}

const initialData = loadInitialState();

type Segment = {
  startMinutes: number;
  endMinutes: number;
  top: number;
  bottom: number;
};

function App() {
  const [events, setEvents] = useState<Event[]>(initialData.events);
  const [dayStartMinutes, setDayStartMinutes] = useState<number>(
    initialData.dayStartMinutes,
  );
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [editingStartTime, setEditingStartTime] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragRect, setDragRect] = useState<DOMRect | null>(null);
  const [pointerOffsetY, setPointerOffsetY] = useState(0);
  const dragStartPointerY = useRef(0);

  const [now, setNow] = useState(() => new Date());
  const [nowLineTop, setNowLineTop] = useState<number | null>(null);

  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const prevRectsRef = useRef(new Map<string, DOMRect>());
  const startCellRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem(DAY_START_KEY, String(dayStartMinutes));
  }, [dayStartMinutes]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  // addEvent/updateEvent ne ferment plus le formulaire elles-mêmes : c'est la
  // modale qui déclenche la fermeture (avec animation) une fois le résultat connu.
  function addEvent(newEvent: Omit<Event, "id">): string | null {
    if (newEvent.specialStartMinutes != null) {
      const conflict = hasSpecialConflict(events, {
        specialStartMinutes: newEvent.specialStartMinutes,
        durationMinutes: newEvent.durationMinutes,
      });
      if (conflict) return "Il y a déjà une tâche à cet horaire.";
    }
    const event: Event = { ...newEvent, id: crypto.randomUUID() };
    const index = insertIndex ?? events.length;
    setEvents((prev) => {
      const next = [...prev];
      next.splice(index, 0, event);
      return next;
    });
    return null;
  }

  function updateEvent(id: string, updated: Omit<Event, "id">): string | null {
    if (updated.specialStartMinutes != null) {
      const conflict = hasSpecialConflict(
        events,
        {
          specialStartMinutes: updated.specialStartMinutes,
          durationMinutes: updated.durationMinutes,
        },
        id,
      );
      if (conflict) return "Il y a déjà une tâche à cet horaire.";
    }
    setEvents((prev) =>
      prev.map((event) => (event.id === id ? { ...updated, id } : event)),
    );
    return null;
  }

  function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  }

  function clearAllEvents() {
    setEvents([]);
    setDayStartMinutes(nowMinutes());
  }

  function updateEventDuration(id: string, durationMinutes: number) {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === id ? { ...event, durationMinutes } : event,
      ),
    );
  }

  function closeForm() {
    setInsertIndex(null);
    setEditingId(null);
  }

  function registerCardRef(id: string, el: HTMLDivElement | null) {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }

  function reorderEvents(draggedId: string, targetId: string) {
    setEvents((prev) => {
      const draggedIndex = prev.findIndex((e) => e.id === draggedId);
      const targetIndex = prev.findIndex((e) => e.id === targetId);
      if (
        draggedIndex === -1 ||
        targetIndex === -1 ||
        draggedIndex === targetIndex
      )
        return prev;
      const next = [...prev];
      const [dragged] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, dragged);
      return next;
    });
  }

  function handleDragStart(id: string, rect: DOMRect, pointerY: number) {
    setDraggingId(id);
    setDragRect(rect);
    dragStartPointerY.current = pointerY;
    setPointerOffsetY(0);
  }

  function handleDragMove(pointerY: number) {
    const offsetY = pointerY - dragStartPointerY.current;
    setPointerOffsetY(offsetY);

    if (!draggingId || !dragRect) return;

    const currentIndex = scheduled.findIndex((e) => e.id === draggingId);
    if (currentIndex === -1) return;

    const draggedCenter = dragRect.top + offsetY + dragRect.height / 2;

    const nextEvent = scheduled[currentIndex + 1];
    if (nextEvent) {
      const nextEl = cardRefs.current.get(nextEvent.id);
      if (nextEl) {
        const nextRect = nextEl.getBoundingClientRect();
        const threshold = nextRect.top + nextRect.height * SWAP_THRESHOLD_RATIO;
        if (draggedCenter > threshold) {
          reorderEvents(draggingId, nextEvent.id);
          return;
        }
      }
    }

    const prevEvent = scheduled[currentIndex - 1];
    if (prevEvent) {
      const prevEl = cardRefs.current.get(prevEvent.id);
      if (prevEl) {
        const prevRect = prevEl.getBoundingClientRect();
        const threshold =
          prevRect.top + prevRect.height * (1 - SWAP_THRESHOLD_RATIO);
        if (draggedCenter < threshold) {
          reorderEvents(draggingId, prevEvent.id);
        }
      }
    }
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragRect(null);
    setPointerOffsetY(0);
  }

  const editingEvent = events.find((event) => event.id === editingId);
  const pendingDeleteEvent = events.find(
    (event) => event.id === pendingDeleteId,
  );
  const isFormOpen = insertIndex !== null || editingId !== null;
  const scheduled = computeSchedule(events, dayStartMinutes);
  const draggedEvent = scheduled.find((event) => event.id === draggingId);
  const scheduledEndMinutes =
    scheduled.length > 0
      ? Math.max(
          ...scheduled.map(
            (event) => event.startMinutes + event.durationMinutes,
          ),
        )
      : dayStartMinutes;

  function arrayIndexAfter(scheduledIndex: number): number {
    if (scheduledIndex === -1) return 0;
    const afterId = scheduled[scheduledIndex].id;
    const idx = events.findIndex((e) => e.id === afterId);
    return idx === -1 ? events.length : idx + 1;
  }

  useEffect(() => {
    rescheduleNotifications(scheduled);
  }, [
    scheduled
      .map((event) => `${event.id}:${event.startMinutes}:${event.label}`)
      .join(","),
  ]);

  // Position de la barre "heure actuelle" — calculée à partir des positions
  // réelles de la cellule Début et des cartes affichées.
  useLayoutEffect(() => {
    const containerEl = listContainerRef.current;
    const startEl = startCellRef.current;
    if (!containerEl || !startEl) {
      setNowLineTop(null);
      return;
    }

    const containerTop = containerEl.getBoundingClientRect().top;
    const segments: Segment[] = [];

    const startRect = startEl.getBoundingClientRect();
    segments.push({
      startMinutes: dayStartMinutes,
      endMinutes: dayStartMinutes,
      top: startRect.bottom - containerTop,
      bottom: startRect.bottom - containerTop,
    });

    scheduled.forEach((event) => {
      const el = cardRefs.current.get(event.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      segments.push({
        startMinutes: event.startMinutes,
        endMinutes: event.startMinutes + event.durationMinutes,
        top: rect.top - containerTop,
        bottom: rect.bottom - containerTop,
      });
    });

    segments.sort((a, b) => a.startMinutes - b.startMinutes);

    const nowM = now.getHours() * 60 + now.getMinutes();

    if (nowM <= segments[0].startMinutes) {
      setNowLineTop(segments[0].top);
      return;
    }
    const last = segments[segments.length - 1];
    if (nowM >= last.endMinutes) {
      setNowLineTop(last.bottom);
      return;
    }

    for (const seg of segments) {
      if (nowM >= seg.startMinutes && nowM <= seg.endMinutes) {
        if (seg.endMinutes === seg.startMinutes) {
          setNowLineTop(seg.top);
          return;
        }
        const fraction =
          (nowM - seg.startMinutes) / (seg.endMinutes - seg.startMinutes);
        setNowLineTop(seg.top + fraction * (seg.bottom - seg.top));
        return;
      }
    }

    for (let i = 0; i < segments.length - 1; i++) {
      const a = segments[i];
      const b = segments[i + 1];
      if (nowM >= a.endMinutes && nowM <= b.startMinutes) {
        const gap = b.startMinutes - a.endMinutes;
        const fraction = gap === 0 ? 0 : (nowM - a.endMinutes) / gap;
        setNowLineTop(a.bottom + fraction * (b.top - a.bottom));
        return;
      }
    }

    setNowLineTop(null);
  }, [
    now,
    dayStartMinutes,
    scheduled
      .map(
        (event) => `${event.id}:${event.startMinutes}:${event.durationMinutes}`,
      )
      .join(","),
  ]);

  useLayoutEffect(() => {
    cardRefs.current.forEach((el) => {
      el.style.transition = "none";
      el.style.transform = "none";
    });

    const newRects = new Map<string, DOMRect>();
    cardRefs.current.forEach((el, id) => {
      newRects.set(id, el.getBoundingClientRect());
    });

    cardRefs.current.forEach((el, id) => {
      const prev = prevRectsRef.current.get(id);
      const next = newRects.get(id);
      if (prev && next) {
        const deltaY = prev.top - next.top;
        if (Math.abs(deltaY) > 0.5) {
          el.style.transform = `translateY(${deltaY}px)`;
        }
      }
    });

    requestAnimationFrame(() => {
      cardRefs.current.forEach((el) => {
        el.style.transition = "transform 200ms ease";
        el.style.transform = "";
      });
    });

    prevRectsRef.current = newRects;
  }, [
    scheduled
      .map(
        (event) => `${event.id}:${event.startMinutes}:${event.durationMinutes}`,
      )
      .join(","),
  ]);

  return (
    <div className="min-h-screen bg-[#1b1d21] flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-center px-4 py-3 bg-[#1b1d21]/95 backdrop-blur border-b border-neutral-800">
        <CalendarLogo className="w-8 h-8" />
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col items-center p-6 pt-24 gap-3 pb-20">
        {showClearAllConfirm && (
          <ConfirmClearAllModal
            onConfirm={clearAllEvents}
            onCancel={() => setShowClearAllConfirm(false)}
          />
        )}

        {editingStartTime && (
          <EditStartTimeModal
            currentMinutes={dayStartMinutes}
            onSave={setDayStartMinutes}
            onCancel={() => setEditingStartTime(false)}
          />
        )}

        {isFormOpen && (
          <Modal onClose={closeForm}>
            {(close) => (
              <>
                <h2 className="text-white text-base font-semibold mb-3">
                  {editingEvent ? "Modifier la tâche" : "Ajouter une tâche"}
                </h2>
                <EventForm
                  initialEvent={editingEvent}
                  onSubmit={(data) => {
                    const result = editingId
                      ? updateEvent(editingId, data)
                      : addEvent(data);
                    if (!result) close();
                    return result;
                  }}
                  onCancel={close}
                />
              </>
            )}
          </Modal>
        )}

        {pendingDeleteEvent && (
          <ConfirmDeleteModal
            label={pendingDeleteEvent.label}
            onConfirm={() => deleteEvent(pendingDeleteEvent.id)}
            onCancel={() => setPendingDeleteId(null)}
          />
        )}

        <div
          ref={listContainerRef}
          className="relative w-full max-w-sm flex flex-col gap-2"
        >
          {nowLineTop !== null && (
            <div
              className="absolute -left-2 -right-2 h-0.5 bg-red-500 rounded-full pointer-events-none z-20"
              style={{ top: nowLineTop }}
            />
          )}

          <StartCell
            startMinutes={dayStartMinutes}
            onEdit={() => setEditingStartTime(true)}
            onInsertAfter={() => setInsertIndex(0)}
            registerRef={(el) => {
              startCellRef.current = el;
            }}
          />

          {scheduled.map((event, i) => (
            <EventCard
              key={event.id}
              event={event}
              onDelete={setPendingDeleteId}
              onEdit={setEditingId}
              onResize={updateEventDuration}
              onInsertAfter={() => setInsertIndex(arrayIndexAfter(i))}
              isDragging={event.id === draggingId}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              registerRef={registerCardRef}
            />
          ))}
        </div>

        {draggingId && dragRect && draggedEvent && (
          <div
            className="fixed flex bg-neutral-900 border-2 border-neutral-600 rounded-2xl overflow-hidden shadow-2xl pointer-events-none z-50"
            style={{
              top: dragRect.top + pointerOffsetY,
              left: dragRect.left,
              width: dragRect.width,
              height: dragRect.height,
            }}
          >
            <EventCardVisual event={draggedEvent} />
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between gap-2 py-3 px-4 bg-[#1b1d21]/95 backdrop-blur border-t border-neutral-800 z-40">
        <div className="w-8 h-8 flex-shrink-0" />
        <p className="flex-1 text-center text-neutral-300 text-sm truncate">
          {formatEndLabel(scheduledEndMinutes)}
        </p>
        <div className="w-8 h-8 flex-shrink-0">
          <button
            onClick={() => setShowClearAllConfirm(true)}
            aria-label="Tout supprimer"
            className="w-8 h-8 rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-red-400 hover:border-red-500 flex items-center justify-center active:scale-95 transition-transform duration-100"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
