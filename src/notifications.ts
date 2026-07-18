import { LocalNotifications } from "@capacitor/local-notifications";
import type { ScheduledEvent } from "./types";

export async function requestNotificationPermission() {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === "granted";
  } catch {
    return false;
  }
}

function minutesToDate(minutes: number): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setMinutes(minutes);
  return date;
}

export async function rescheduleNotifications(events: ScheduledEvent[]) {
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    const now = new Date();
    const notifications = events
      .map((event, index) => ({ event, index }))
      .filter(({ event }) => minutesToDate(event.startMinutes) > now)
      .map(({ event, index }) => ({
        id: index + 1,
        title: event.label,
        body: event.category ? `Catégorie : ${event.category}` : "C'est l'heure !",
        schedule: { at: minutesToDate(event.startMinutes) },
      }));

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch {
    // Les notifications ne sont pas disponibles sur cette plateforme (ex: navigateur sans support)
  }
}
