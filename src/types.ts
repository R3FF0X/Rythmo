export type Event = {
  id: string;
  category: string;
  label: string;
  startMinutes: number; // minutes depuis minuit (9h00 = 540)
  durationMinutes: number;
};

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}H${m.toString().padStart(2, "0")}`;
}
