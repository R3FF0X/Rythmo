import { useState, useEffect } from "react";
import type { Event } from "./types";
import EventForm from "./EventForm";
import EventCard from "./EventCard";

const STORAGE_KEY = "rythmo-events";

function loadEvents(): Event[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function App() {
  const [events, setEvents] = useState<Event[]>(loadEvents);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  function addEvent(newEvent: Omit<Event, "id">) {
    const event: Event = { ...newEvent, id: crypto.randomUUID() };
    setEvents((prev) =>
      [...prev, event].sort((a, b) => a.startMinutes - b.startMinutes),
    );
    setIsAdding(false);
  }

  function updateEvent(id: string, updated: Omit<Event, "id">) {
    setEvents((prev) =>
      prev
        .map((event) => (event.id === id ? { ...updated, id } : event))
        .sort((a, b) => a.startMinutes - b.startMinutes),
    );
    setEditingId(null);
  }

  function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  }

  function closeForm() {
    setIsAdding(false);
    setEditingId(null);
  }

  const editingEvent = events.find((event) => event.id === editingId);
  const isFormOpen = isAdding || editingId !== null;
  const isEmpty = events.length === 0;

  return (
    <div
      className={`min-h-screen bg-[#1b1d21] flex flex-col items-center p-6 gap-3 ${isEmpty ? "justify-center" : "justify-start"}`}
    >
      {isEmpty && !isFormOpen && (
        <button
          onClick={() => setIsAdding(true)}
          className="w-14 h-14 rounded-full border border-neutral-700 text-white text-2xl flex items-center justify-center"
        >
          +
        </button>
      )}

      {isFormOpen && (
        <EventForm
          initialEvent={editingEvent}
          onSubmit={(data) =>
            editingId ? updateEvent(editingId, data) : addEvent(data)
          }
          onCancel={closeForm}
        />
      )}

      {!isEmpty && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onDelete={deleteEvent}
              onEdit={setEditingId}
            />
          ))}
          {!isFormOpen && (
            <button
              onClick={() => setIsAdding(true)}
              className="self-center w-10 h-10 rounded-full border border-neutral-700 text-white text-xl flex items-center justify-center"
            >
              +
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
