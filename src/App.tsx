import { useEffect, useMemo, useState, type FormEvent } from 'react'
import './App.css'
import {
  DAY_MINUTES,
  STORAGE_KEY,
  buildActivity,
  createDefaultFormValues,
  createTodayPlan,
  formatDateLabel,
  formatDuration,
  formatTimeLabel,
  getDateKey,
  getStoredPlans,
  minutesToTime,
  timeToMinutes,
  sortActivities,
  type Activity,
  type DailyPlan,
  type PlannerStore,
} from './planner'

type FormState = {
  title: string
  startTime: string
  durationHours: string
  durationMinutes: string
}

const THEME_STORAGE_KEY = 'dayly-planner/theme'

function App() {
  const [todayPlan, setTodayPlan] = useState<DailyPlan>(getInitialPlan)
  const [form, setForm] = useState<FormState>(() =>
    createDefaultFormValues(getInitialPlan()),
  )
  const [error, setError] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitialTheme())
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  useEffect(() => {
    const store: PlannerStore = getStoredPlans()
    store.days[todayPlan.dateKey] = todayPlan
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, [todayPlan])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const sortedActivities = useMemo(
    () => sortActivities(todayPlan.activities),
    [todayPlan.activities],
  )

  const totalPlannedMinutes = useMemo(
    () =>
      sortedActivities.reduce(
        (total, activity) => total + activity.durationMinutes,
        0,
      ),
    [sortedActivities],
  )

  const availableMinutes = useMemo(() => {
    const startMinutes = todayPlan.openedAtMinutes
    return Math.max(0, DAY_MINUTES - startMinutes)
  }, [todayPlan.openedAtMinutes])

  const computedEndTime = useMemo(() => {
    const startMinutes = timeToMinutes(form.startTime)
    const durationMinutes = getDurationInMinutes(form)

    if (Number.isNaN(startMinutes) || durationMinutes <= 0) {
      return null
    }

    const endMinutes = startMinutes + durationMinutes

    if (endMinutes > DAY_MINUTES) {
      return null
    }

    return minutesToTime(endMinutes)
  }, [form])

  function updateFormValue<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = buildActivity({
      title: form.title,
      startTime: form.startTime,
      endTime: computedEndTime ?? '',
      openedAtMinutes: todayPlan.openedAtMinutes,
    })

    if ('error' in result) {
      setError(result.error)
      return
    }

    const nextPlan = {
      ...todayPlan,
      activities: sortActivities([...todayPlan.activities, result.activity]),
    }

    setTodayPlan(nextPlan)
    setForm(createDefaultFormValues(nextPlan))
    setError('')
    setIsComposerOpen(false)
  }

  function toggleActivity(id: string) {
    setTodayPlan((current) => ({
      ...current,
      activities: current.activities.map((activity) =>
        activity.id === id
          ? { ...activity, completed: !activity.completed }
          : activity,
      ),
    }))
  }

  function deleteActivity(id: string) {
    setTodayPlan((current) => ({
      ...current,
      activities: current.activities.filter((activity) => activity.id !== id),
    }))
  }

  function clearTodayPlan() {
    setTodayPlan((current) => ({ ...current, activities: [] }))
    setForm(createDefaultFormValues(todayPlan))
    setError('')
  }

  return (
    <main className="planner-shell">
      <section className="toolbar-card">
        <div>
          <p className="eyebrow">Daily planning app</p>
          <h1 className="top-title">Today&apos;s plan first.</h1>
          <p className="hero-copy">
            Create activities in a popup, keep the agenda front and center, and
            save the whole day locally.
          </p>
        </div>
        <div className="toolbar-actions">
          <button
            className="primary-button action-button"
            type="button"
            onClick={() => {
              setForm(createDefaultFormValues(todayPlan))
              setError('')
              setIsComposerOpen(true)
            }}
          >
            Create activity
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={clearTodayPlan}
            disabled={todayPlan.activities.length === 0}
          >
            Clear day
          </button>
          <button
            className="theme-button"
            type="button"
            onClick={() =>
              setTheme((current) => (current === 'light' ? 'dark' : 'light'))
            }
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>
      </section>

      <section className="timeline-card" aria-labelledby="agenda-heading">
        <div className="hero-stats compact-stats" aria-label="Planner summary">
          <article className="stat-card">
            <span className="stat-label">Today</span>
            <strong>{formatDateLabel(todayPlan.dateKey)}</strong>
          </article>
          <article className="stat-card">
            <span className="stat-label">Day starts</span>
            <strong>{formatTimeLabel(todayPlan.openedAt)}</strong>
          </article>
          <article className="stat-card">
            <span className="stat-label">Planned</span>
            <strong>{formatDuration(totalPlannedMinutes)}</strong>
          </article>
          <article className="stat-card">
            <span className="stat-label">Open time left</span>
            <strong>{formatDuration(availableMinutes - totalPlannedMinutes)}</strong>
          </article>
        </div>

        <section className="agenda-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Schedule</p>
              <h2 id="agenda-heading">Today&apos;s agenda</h2>
            </div>
            <p className="activity-count">
              {todayPlan.activities.length}{' '}
              {todayPlan.activities.length === 1 ? 'activity' : 'activities'}
            </p>
          </div>

          {sortedActivities.length === 0 ? (
            <div className="empty-state">
              <p>No activities yet.</p>
              <p>Add your first block to start shaping the day.</p>
            </div>
          ) : (
            <ol className="timeline-list">
              {sortedActivities.map((activity) => (
                <TimelineItem
                  key={activity.id}
                  activity={activity}
                  onToggle={toggleActivity}
                  onDelete={deleteActivity}
                />
              ))}
            </ol>
          )}
        </section>
      </section>

      <section className="hero-panel">
        <p className="eyebrow">Overview</p>
        <h2>Build the day from the moment you open it.</h2>
        <p className="hero-copy">
          The planner creates a fresh schedule the first time you open it each
          day, anchors it to that opening time, and keeps everything in local
          storage.
        </p>
      </section>

      {isComposerOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            setIsComposerOpen(false)
            setError('')
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-activity-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <form className="composer-card modal-form" onSubmit={handleSubmit}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Add activity</p>
                  <h2 id="create-activity-heading">Plan a block</h2>
                </div>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setIsComposerOpen(false)
                    setError('')
                  }}
                >
                  Close
                </button>
              </div>

              <label className="field">
                <span>Task or activity</span>
                <input
                  name="title"
                  value={form.title}
                  onChange={(event) => updateFormValue('title', event.target.value)}
                  placeholder="Deep work, gym, client call..."
                  maxLength={80}
                />
              </label>

              <div className="time-grid">
                <label className="field">
                  <span>Start time</span>
                  <input
                    name="startTime"
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      updateFormValue('startTime', event.target.value)
                    }
                  />
                </label>

                <label className="field">
                  <span>Hours</span>
                  <input
                    name="durationHours"
                    type="number"
                    min="0"
                    max="23"
                    value={form.durationHours}
                    onChange={(event) =>
                      updateFormValue('durationHours', event.target.value)
                    }
                  />
                </label>
              </div>

              <div className="time-grid">
                <label className="field">
                  <span>Minutes</span>
                  <input
                    name="durationMinutes"
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={form.durationMinutes}
                    onChange={(event) =>
                      updateFormValue('durationMinutes', event.target.value)
                    }
                  />
                </label>

                <div className="preview-card" aria-live="polite">
                  <span className="preview-label">Calculated end</span>
                  <strong>
                    {computedEndTime ? formatTimeLabel(computedEndTime) : 'Invalid'}
                  </strong>
                  <p>{formatDuration(getDurationInMinutes(form))}</p>
                </div>
              </div>

              <p className="helper-copy">
                The schedule starts at {formatTimeLabel(todayPlan.openedAt)} on{' '}
                {formatDateLabel(todayPlan.dateKey)}.
              </p>

              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button className="primary-button" type="submit">
                Add to today
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}

type TimelineItemProps = {
  activity: Activity
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

function TimelineItem({ activity, onToggle, onDelete }: TimelineItemProps) {
  return (
    <li className={`timeline-item${activity.completed ? ' is-complete' : ''}`}>
      <div className="timeline-accent" aria-hidden="true" />
      <div className="timeline-content">
        <div className="timeline-meta">
          <p className="time-range">
            {formatTimeLabel(activity.startTime)} to{' '}
            {formatTimeLabel(activity.endTime)}
          </p>
          <p className="duration-pill">{formatDuration(activity.durationMinutes)}</p>
        </div>
        <h3>{activity.title}</h3>
        <div className="timeline-actions">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={activity.completed}
              onChange={() => onToggle(activity.id)}
            />
            <span>Completed</span>
          </label>
          <button
            className="ghost-button"
            type="button"
            onClick={() => onDelete(activity.id)}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  )
}

function getInitialTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }

  return 'light'
}

function getInitialPlan() {
  const now = new Date()
  const store = getStoredPlans()
  const dateKey = getDateKey(now)

  return store.days[dateKey] ?? createTodayPlan(now)
}

function getDurationInMinutes(form: FormState) {
  const hours = Number(form.durationHours || 0)
  const minutes = Number(form.durationMinutes || 0)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return 0
  }

  return hours * 60 + minutes
}

export default App
