import { useState, useEffect, useRef, useLayoutEffect } from "react";
import type { Event } from "./types";
import {
  computeSchedule,
  hasSpecialConflict,
  formatMinutes,
  formatEndLabel,
  DEFAULT_DAY_START_MINUTES,
} from "./types";
import EventForm from "./EventForm";
import EventCard from "./EventCard";
import EventCardVisual from "./EventCardVisual";
import InsertButton from "./InsertButton";
import Modal from "./Modal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import ConfirmClearAllModal from "./ConfirmClearAllModal";
import DayStartPicker from "./DayStartPicker";
import TrashIcon from "./TrashIcon";
import CalendarLogo from "./CalendarLogo";
import { requestNotificationPermission, rescheduleNotifications } from "./notifications";

const STORAGE_KEY = "rythmo-events";
const DAY_START_KEY = "rythmo-day-start";
const DATE_KEY = "rythmo-date";
const SWAP_THRESHOLD_RATIO = 0.6;

const TODAY_LABEL = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

function loadInitialState(): {
  events: Event[];
  dayStartMinutes: number | null;
} {
  const storedDate = localStorage.getItem(DATE_KEY);
  const isNewDay = storedDate !== todayKey();

  if (isNewDay) {
    localStorage.setItem(DATE_KEY, todayKey());
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DAY_START_KEY);
    return { events: [], dayStartMinutes: null };
  }

  const rawEvents = localStorage.getItem(STORAGE_KEY);
  const rawDayStart = localStorage.getItem(DAY_START_KEY);
  return {
    events: rawEvents ? JSON.parse(rawEvents) : [],
    dayStartMinutes: rawDayStart ? Number(rawDayStart) : null,
  };
}

const initialData = loadInitialState();

function App() {
  const [events, setEvents] = useState<Event[]>(initialData.events);
  const [dayStartMinutes, setDayStartMinutes] = useState<number | null>(
    initialData.dayStartMinutes,
  );
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragRect, setDragRect] = useState<DOMRect | null>(null);
  const [pointerOffsetY, setPointerOffsetY] = useState(0);
  const dragStartPointerY = useRef(0);

  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const prevRectsRef = useRef(new Map<string, DOMRect>());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    if (dayStartMinutes !== null) {
      localStorage.setItem(DAY_START_KEY, String(dayStartMinutes));
    }
  }, [dayStartMinutes]);

  useEffect(() => {
    if (dayStartMinutes !== null) {
      requestNotificationPermission();
    }
  }, [dayStartMinutes]);

  function handleSelectDayStart(minutes: number) {
    setDayStartMinutes(minutes);
  }

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
    const next = events.filter((event) => event.id !== id);
    setEvents(next);
    if (next.length === 0) {
      setDayStartMinutes(null);
      localStorage.removeItem(DAY_START_KEY);
    }
  }

  function clearAllEvents() {
    setEvents([]);
    setDayStartMinutes(null);
    localStorage.removeItem(DAY_START_KEY);
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
  const isEmpty = events.length === 0;
  const effectiveDayStart = dayStartMinutes ?? DEFAULT_DAY_START_MINUTES;
  const scheduled = computeSchedule(events, effectiveDayStart);
  const draggedEvent = scheduled.find((event) => event.id === draggingId);
  const canInsertBeforeFirst =
    scheduled.length === 0 || scheduled[0].startMinutes > effectiveDayStart;
  const scheduledEndMinutes =
    scheduled.length > 0
      ? Math.max(
          ...scheduled.map(
            (event) => event.startMinutes + event.durationMinutes,
          ),
        )
      : null;

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
      {dayStartMinutes === null ? (
        <div className="flex flex-col items-center gap-1 pt-10">
          <CalendarLogo className="w-16 h-16" />
          <h1 className="text-white text-2xl font-semibold text-center capitalize">
            {TODAY_LABEL}
          </h1>
        </div>
      ) : (
        <header className="fixed top-0 left-0 right-0 z-30 flex items-center gap-2 px-4 py-3 bg-[#1b1d21]/95 backdrop-blur border-b border-neutral-800">
          <CalendarLogo className="w-8 h-8 flex-shrink-0" />
          <div className="flex-1 flex flex-col items-center">
            <h1 className="text-white text-lg font-semibold text-center capitalize">
              {TODAY_LABEL}
            </h1>
            <p className="text-neutral-400 text-xs">
              Début à {formatMinutes(dayStartMinutes)}
            </p>
          </div>
          <div className="w-8 h-8 flex-shrink-0" />
        </header>
      )}

      <div
        className={`flex-1 overflow-y-auto flex flex-col items-center p-6 gap-3 pb-20 ${dayStartMinutes !== null ? "pt-24" : ""}`}
      >
        {dayStartMinutes === null && (
          <div className="flex-1 w-full flex items-center justify-center">
            <DayStartPicker onSelect={handleSelectDayStart} />
          </div>
        )}

        {showClearAllConfirm && (
          <ConfirmClearAllModal
            onConfirm={clearAllEvents}
            onCancel={() => setShowClearAllConfirm(false)}
          />
        )}

        {dayStartMinutes !== null && (
          <div
            className={`flex-1 w-full flex flex-col items-center ${isEmpty ? "justify-center" : "justify-start"}`}
          >
          {isEmpty && !isFormOpen && (
            <button
              onClick={() => setInsertIndex(0)}
              className="w-14 h-14 rounded-full border border-neutral-700 text-white text-2xl flex items-center justify-center active:scale-95 transition-transform duration-100"
            >
              +
            </button>
          )}

          {isFormOpen && (
            <Modal onClose={closeForm}>
              {(close) => (
                <>
                  <h2 className="text-white text-base font-semibold mb-3">
                    {editingEvent ? "Modifier la tâche" : "Nouvelle tâche"}
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

          {!isEmpty && (
            <div className="w-full max-w-sm flex flex-col gap-2">
              {canInsertBeforeFirst && (
                <InsertButton
                  onClick={() => setInsertIndex(arrayIndexAfter(-1))}
                />
              )}
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
          )}

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
      )}
      </div>

      {dayStartMinutes !== null && scheduledEndMinutes !== null && (
        <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between gap-2 py-3 px-4 bg-[#1b1d21]/95 backdrop-blur border-t border-neutral-800 z-40">
          <div className="w-8 h-8 flex-shrink-0" />
          <p className="flex-1 text-center text-neutral-300 text-sm truncate">
            {formatEndLabel(scheduledEndMinutes)}
          </p>
          <div className="w-8 h-8 flex-shrink-0">
            {!isEmpty && (
              <button
                onClick={() => setShowClearAllConfirm(true)}
                aria-label="Tout supprimer"
                className="w-8 h-8 rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-red-400 hover:border-red-500 flex items-center justify-center active:scale-95 transition-transform duration-100"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
