import { useState, useEffect, useRef, useLayoutEffect } from "react";
import type { Event } from "./types";
import {
  computeSchedule,
  hasSpecialConflict,
  formatMinutes,
  formatEndLabel,
} from "./types";
import EventForm from "./EventForm";
import EventCard from "./EventCard";
import EventCardVisual from "./EventCardVisual";
import EditStartTimeModal from "./EditStartTimeModal";
import Modal from "./Modal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import ConfirmClearAllModal from "./ConfirmClearAllModal";
import TrashIcon from "./TrashIcon";
import PencilIcon from "./PencilIcon";
import CalendarLogo from "./CalendarLogo";
import MenuToggleButton from "./MenuToggleButton";
import SideMenu from "./SideMenu";
import { requestNotificationPermission, rescheduleNotifications } from "./notifications";

const STORAGE_KEY = "rythmo-events";
const DAY_START_KEY = "rythmo-day-start";
const DAY_DATE_KEY = "rythmo-day-date";
const SWAP_THRESHOLD_RATIO = 0.6;

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

// Reconstruit l'instant réel de fin de journée : la date à laquelle l'heure de
// début a été choisie, plus le nombre de minutes écoulées jusqu'à la fin de la
// dernière tâche (qui peut dépasser 24h pour une tâche finissant après minuit).
function computeAbsoluteEnd(dateKey: string, endMinutes: number): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m, d, 0, 0, 0, 0);
  date.setMinutes(date.getMinutes() + endMinutes);
  return date;
}

function loadInitialState(): {
  events: Event[];
  dayStartMinutes: number | null;
} {
  const rawEvents = localStorage.getItem(STORAGE_KEY);
  const rawDayStart = localStorage.getItem(DAY_START_KEY);
  return {
    events: rawEvents ? JSON.parse(rawEvents) : [],
    dayStartMinutes: rawDayStart ? Number(rawDayStart) : null,
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
  const [dayStartMinutes, setDayStartMinutes] = useState<number | null>(
    initialData.dayStartMinutes,
  );
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [editingStartTime, setEditingStartTime] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragRect, setDragRect] = useState<DOMRect | null>(null);
  const [pointerOffsetY, setPointerOffsetY] = useState(0);
  const dragStartPointerY = useRef(0);

  const [now, setNow] = useState(() => new Date());
  const [nowLineTop, setNowLineTop] = useState<number | null>(null);

  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const prevRectsRef = useRef(new Map<string, DOMRect>());
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    if (dayStartMinutes !== null) {
      localStorage.setItem(DAY_START_KEY, String(dayStartMinutes));
    } else {
      localStorage.removeItem(DAY_START_KEY);
    }
  }, [dayStartMinutes]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  // Si une heure de début existe déjà (agenda repris d'une session précédente)
  // mais qu'aucune date n'a été enregistrée, on suppose "aujourd'hui" plutôt
  // que de ne jamais expirer l'agenda.
  useEffect(() => {
    if (dayStartMinutes !== null && !localStorage.getItem(DAY_DATE_KEY)) {
      localStorage.setItem(DAY_DATE_KEY, todayKey());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSaveDayStart(minutes: number) {
    if (dayStartMinutes === null) {
      localStorage.setItem(DAY_DATE_KEY, todayKey());
    }
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
    setEvents((prev) => prev.filter((event) => event.id !== id));
  }

  function clearAllEvents() {
    setEvents([]);
    setDayStartMinutes(null);
    localStorage.removeItem(DAY_DATE_KEY);
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
  const scheduled =
    dayStartMinutes !== null ? computeSchedule(events, dayStartMinutes) : [];
  const draggedEvent = scheduled.find((event) => event.id === draggingId);
  const scheduledEndMinutes =
    scheduled.length > 0
      ? Math.max(
          ...scheduled.map(
            (event) => event.startMinutes + event.durationMinutes,
          ),
        )
      : (dayStartMinutes ?? 0);

  function arrayIndexAfter(scheduledIndex: number): number {
    if (scheduledIndex === -1) return 0;
    const afterId = scheduled[scheduledIndex].id;
    const idx = events.findIndex((e) => e.id === afterId);
    return idx === -1 ? events.length : idx + 1;
  }

  // Réinitialise l'agenda seulement une fois qu'on a changé de jour calendaire
  // ET qu'il n'y a plus de tâche en cours (une tâche finissant à 0h30 le
  // lendemain doit rester affichée jusqu'à cette heure-là avant de tout vider).
  useEffect(() => {
    if (dayStartMinutes === null) return;
    const dateKey = localStorage.getItem(DAY_DATE_KEY);
    if (!dateKey) return;

    const isNewDay = dateKey !== todayKey();
    if (!isNewDay) return;

    if (scheduled.length === 0) {
      setEvents([]);
      setDayStartMinutes(null);
      localStorage.removeItem(DAY_DATE_KEY);
      return;
    }

    const absoluteEnd = computeAbsoluteEnd(dateKey, scheduledEndMinutes);
    if (now > absoluteEnd) {
      setEvents([]);
      setDayStartMinutes(null);
      localStorage.removeItem(DAY_DATE_KEY);
    }
  }, [now, dayStartMinutes, scheduledEndMinutes, scheduled.length]);

  useEffect(() => {
    rescheduleNotifications(scheduled);
  }, [
    scheduled
      .map((event) => `${event.id}:${event.startMinutes}:${event.label}`)
      .join(","),
  ]);

  // Position de la barre "heure actuelle" — masquée en dehors de la plage
  // [début de journée, fin de la dernière tâche], et s'il n'y a aucune tâche.
  useLayoutEffect(() => {
    if (dayStartMinutes === null || scheduled.length === 0) {
      setNowLineTop(null);
      return;
    }

    const containerEl = listContainerRef.current;
    if (!containerEl) {
      setNowLineTop(null);
      return;
    }

    const containerTop = containerEl.getBoundingClientRect().top;
    const segments: Segment[] = [
      { startMinutes: dayStartMinutes, endMinutes: dayStartMinutes, top: 0, bottom: 0 },
    ];

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
    const rangeEnd = segments[segments.length - 1].endMinutes;

    if (nowM < dayStartMinutes || nowM > rangeEnd) {
      setNowLineTop(null);
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
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-[#1b1d21]/95 backdrop-blur border-b border-neutral-800">
        <div className="relative w-full h-full">
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-300 ease-out"
            style={{ left: dayStartMinutes !== null ? "2.5rem" : "50%" }}
          >
            <CalendarLogo className="w-8 h-8" />
          </div>

          {dayStartMinutes !== null && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <button
                onClick={() => setEditingStartTime(true)}
                className="modal-content-in flex items-center gap-1.5 bg-neutral-800 rounded-full pl-3 pr-2.5 py-1.5 active:scale-95 transition-transform duration-100"
              >
                <span className="text-white text-sm font-medium whitespace-nowrap">
                  Commence aujourd'hui à {formatMinutes(dayStartMinutes)}
                </span>
                <PencilIcon className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="fixed top-0 right-4 h-14 z-[80] flex items-center">
        <MenuToggleButton
          isOpen={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        />
      </div>

      <SideMenu isOpen={isMenuOpen} />

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
            onSave={handleSaveDayStart}
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

        {dayStartMinutes === null && (
          <div className="flex-1 w-full flex items-center justify-center">
            <button
              onClick={() => setEditingStartTime(true)}
              className="px-6 py-3 rounded-xl bg-white text-black font-semibold active:scale-95 transition-transform duration-100"
            >
              Choisir l'heure de début
            </button>
          </div>
        )}

        {dayStartMinutes !== null && scheduled.length === 0 && (
          <div className="flex-1 w-full flex items-center justify-center">
            {!isFormOpen && (
              <button
                onClick={() => setInsertIndex(0)}
                className="w-14 h-14 rounded-full border border-neutral-700 text-white text-2xl flex items-center justify-center active:scale-95 transition-transform duration-100"
              >
                +
              </button>
            )}
          </div>
        )}

        {dayStartMinutes !== null && scheduled.length > 0 && (
          <div
            ref={listContainerRef}
            className="relative w-full max-w-sm flex flex-col gap-2"
          >
            {nowLineTop !== null && (
              <div
                className="absolute -left-2 -right-2 pointer-events-none z-20"
                style={{ top: nowLineTop }}
              >
                <div className="relative h-0.5 bg-red-500">
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1"
                    style={{
                      width: 0,
                      height: 0,
                      borderTop: "5px solid transparent",
                      borderBottom: "5px solid transparent",
                      borderLeft: "7px solid #ef4444",
                    }}
                  />
                  <div
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1"
                    style={{
                      width: 0,
                      height: 0,
                      borderTop: "5px solid transparent",
                      borderBottom: "5px solid transparent",
                      borderRight: "7px solid #ef4444",
                    }}
                  />
                </div>
              </div>
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

      {dayStartMinutes !== null && (
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
      )}
    </div>
  );
}

export default App;
