export type Event = {
  id: string
  category: string
  label: string
  durationMinutes: number
  specialStartMinutes: number | null
}

export type ScheduledEvent = Event & { startMinutes: number }

export const DEFAULT_DAY_START_MINUTES = 9 * 60

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}H${m.toString().padStart(2, "0")}`
}

export function formatEndLabel(endMinutes: number): string {
  if (endMinutes >= 24 * 60) {
    return `Termine demain à ${formatMinutes(endMinutes - 24 * 60)}`
  }
  return `Termine aujourd'hui à ${formatMinutes(endMinutes)}`
}

export function computeSchedule(events: Event[], dayStartMinutes: number): ScheduledEvent[] {
  const specials = events
    .filter((e) => e.specialStartMinutes != null)
    .sort((a, b) => a.specialStartMinutes! - b.specialStartMinutes!)

  const flexibles = events.filter((e) => e.specialStartMinutes == null)

  const scheduled: ScheduledEvent[] = specials.map((e) => ({
    ...e,
    startMinutes: e.specialStartMinutes!,
  }))

  let cursor = dayStartMinutes
  let specialIndex = 0

  function skipPassedSpecials() {
    while (
      specialIndex < specials.length &&
      cursor >= specials[specialIndex].specialStartMinutes!
    ) {
      const special = specials[specialIndex]
      cursor = Math.max(cursor, special.specialStartMinutes! + special.durationMinutes)
      specialIndex++
    }
  }

  for (const event of flexibles) {
    skipPassedSpecials()

    const nextSpecial = specials[specialIndex]
    const gapEnd = nextSpecial ? nextSpecial.specialStartMinutes! : Infinity
    const available = gapEnd - cursor

    if (event.durationMinutes > available && nextSpecial) {
      cursor = nextSpecial.specialStartMinutes! + nextSpecial.durationMinutes
      specialIndex++
      skipPassedSpecials()
    }

    scheduled.push({ ...event, startMinutes: cursor })
    cursor += event.durationMinutes
  }

  return scheduled.sort((a, b) => a.startMinutes - b.startMinutes)
}

export function hasSpecialConflict(
  events: Event[],
  candidate: { specialStartMinutes: number; durationMinutes: number },
  excludeId?: string
): boolean {
  const candidateStart = candidate.specialStartMinutes
  const candidateEnd = candidateStart + candidate.durationMinutes

  return events.some((event) => {
    if (event.specialStartMinutes == null || event.id === excludeId) return false
    const existingStart = event.specialStartMinutes
    const existingEnd = existingStart + event.durationMinutes
    return candidateStart < existingEnd && existingStart < candidateEnd
  })
}