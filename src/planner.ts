export const STORAGE_KEY = 'dayly-planner/store'
export const DAY_MINUTES = 24 * 60

export type Activity = {
  id: string
  title: string
  startTime: string
  endTime: string
  durationMinutes: number
  completed: boolean
}

export type DailyPlan = {
  dateKey: string
  openedAt: string
  openedAtMinutes: number
  activities: Activity[]
}

export type PlannerStore = {
  days: Record<string, DailyPlan>
}

type BuildActivityInput = {
  title: string
  startTime: string
  endTime: string
  openedAtMinutes: number
}

type BuildActivityResult =
  | {
      activity: Activity
    }
  | {
      error: string
    }

export function getStoredPlans(): PlannerStore {
  const rawStore = localStorage.getItem(STORAGE_KEY)

  if (!rawStore) {
    return { days: {} }
  }

  try {
    const parsed = JSON.parse(rawStore) as Partial<PlannerStore>

    if (!parsed.days || typeof parsed.days !== 'object') {
      return { days: {} }
    }

    return {
      days: Object.fromEntries(
        Object.entries(parsed.days).flatMap(([dateKey, plan]) => {
          if (!isDailyPlan(plan)) {
            return []
          }

          return [[dateKey, sortDailyPlan(plan)]]
        }),
      ),
    }
  } catch {
    return { days: {} }
  }
}

export function createTodayPlan(now: Date): DailyPlan {
  const openedAt = minutesToTime(now.getHours() * 60 + now.getMinutes())

  return {
    dateKey: getDateKey(now),
    openedAt,
    openedAtMinutes: timeToMinutes(openedAt),
    activities: [],
  }
}

export function createDefaultFormValues(source: Date | DailyPlan) {
  if (source instanceof Date) {
    const startMinutes = source.getHours() * 60 + source.getMinutes()

    return {
      title: '',
      startTime: minutesToTime(startMinutes),
      durationHours: '0',
      durationMinutes: '30',
    }
  }

  const nextStartTime = getNextStartTime(source)

  return {
    title: '',
    startTime: nextStartTime,
    durationHours: '0',
    durationMinutes: '30',
  }
}

export function buildActivity(input: BuildActivityInput): BuildActivityResult {
  const title = input.title.trim()

  if (!title) {
    return { error: 'Enter a task or activity name.' } as const
  }

  const startMinutes = timeToMinutes(input.startTime)
  const endMinutes = timeToMinutes(input.endTime)

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
    return { error: 'Choose a valid start time and duration.' } as const
  }

  if (startMinutes < input.openedAtMinutes) {
    return {
      error: 'Activities must start at or after the first time you opened the app today.',
    } as const
  }

  if (endMinutes <= startMinutes) {
    return { error: 'Duration must be greater than zero.' } as const
  }

  if (endMinutes > DAY_MINUTES) {
    return { error: 'This activity runs past the end of the day.' } as const
  }

  return {
    activity: {
      id: `${title}-${input.startTime}-${getActivityId()}`,
      title,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: endMinutes - startMinutes,
      completed: false,
    },
  } as const
}

export function sortActivities(activities: Activity[]) {
  return [...activities].sort((left, right) => {
    const timeDifference =
      timeToMinutes(left.startTime) - timeToMinutes(right.startTime)

    if (timeDifference !== 0) {
      return timeDifference
    }

    return left.title.localeCompare(right.title)
  })
}

export function formatDuration(totalMinutes: number) {
  const safeMinutes = Math.max(0, totalMinutes)
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  if (hours === 0) {
    return `${minutes} min`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

export function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatTimeLabel(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date(2026, 0, 1, hours, minutes)

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)

  return hours * 60 + minutes
}

export function minutesToTime(totalMinutes: number) {
  const clamped = Math.max(0, Math.min(totalMinutes, DAY_MINUTES))
  const normalized = clamped === DAY_MINUTES ? DAY_MINUTES - 1 : clamped
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60

  return `${`${hours}`.padStart(2, '0')}:${`${minutes}`.padStart(2, '0')}`
}

export function getNextStartTime(plan: DailyPlan) {
  if (plan.activities.length === 0) {
    return plan.openedAt
  }

  const latestActivity = plan.activities.reduce((latest, current) => {
    return timeToMinutes(current.endTime) > timeToMinutes(latest.endTime)
      ? current
      : latest
  })

  return latestActivity.endTime
}

function isDailyPlan(value: unknown): value is DailyPlan {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<DailyPlan>

  return (
    typeof candidate.dateKey === 'string' &&
    typeof candidate.openedAt === 'string' &&
    typeof candidate.openedAtMinutes === 'number' &&
    Array.isArray(candidate.activities)
  )
}

function sortDailyPlan(plan: DailyPlan): DailyPlan {
  return {
    ...plan,
    activities: sortActivities(
      plan.activities.filter((activity): activity is Activity => {
        return (
          !!activity &&
          typeof activity.id === 'string' &&
          typeof activity.title === 'string' &&
          typeof activity.startTime === 'string' &&
          typeof activity.endTime === 'string' &&
          typeof activity.durationMinutes === 'number' &&
          typeof activity.completed === 'boolean'
        )
      }),
    ),
  }
}

function getActivityId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
