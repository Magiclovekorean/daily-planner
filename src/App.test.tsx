import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './planner'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates a new daily plan and lets the user add an activity', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 22, 9, 15))

    render(<App />)

    expect(screen.getByText(/day starts/i)).toBeInTheDocument()
    expect(
      within(screen.getByLabelText(/planner summary/i)).getByText(/9:15/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /create activity/i }))
    const dialog = screen.getByRole('dialog', { name: /plan a block/i })

    fireEvent.change(within(dialog).getByLabelText(/task or activity/i), {
      target: { value: 'Planning sprint' },
    })
    fireEvent.change(within(dialog).getByLabelText(/start time/i), {
      target: { value: '09:30' },
    })
    fireEvent.change(within(dialog).getByLabelText(/hours/i), {
      target: { value: '1' },
    })
    fireEvent.change(within(dialog).getByLabelText(/minutes/i), {
      target: { value: '15' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /add to today/i }))

    const agenda = screen.getByRole('list')
    const activity = within(agenda).getByText('Planning sprint')

    expect(activity).toBeInTheDocument()
    expect(within(agenda).getByText(/1h 15m/i)).toBeInTheDocument()
    expect(within(agenda).getByText(/9:30/i)).toBeInTheDocument()
  })

  it('shows validation when an activity starts before the day opened', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 22, 11, 0))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /create activity/i }))
    const dialog = screen.getByRole('dialog', { name: /plan a block/i })

    fireEvent.change(within(dialog).getByLabelText(/task or activity/i), {
      target: { value: 'Retro' },
    })
    fireEvent.change(within(dialog).getByLabelText(/start time/i), {
      target: { value: '10:30' },
    })
    fireEvent.change(within(dialog).getByLabelText(/hours/i), {
      target: { value: '1' },
    })
    fireEvent.change(within(dialog).getByLabelText(/minutes/i), {
      target: { value: '0' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /add to today/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      /must start at or after the first time you opened the app today/i,
    )
  })

  it('persists activities and completion status in local storage', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 22, 8, 0))

    const view = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /create activity/i }))
    const dialog = screen.getByRole('dialog', { name: /plan a block/i })

    fireEvent.change(within(dialog).getByLabelText(/task or activity/i), {
      target: { value: 'Workout' },
    })
    fireEvent.change(within(dialog).getByLabelText(/start time/i), {
      target: { value: '08:15' },
    })
    fireEvent.change(within(dialog).getByLabelText(/hours/i), {
      target: { value: '0' },
    })
    fireEvent.change(within(dialog).getByLabelText(/minutes/i), {
      target: { value: '45' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /add to today/i }))
    fireEvent.click(screen.getByLabelText(/completed/i))

    view.unmount()
    render(<App />)

    expect(screen.getByText('Workout')).toBeInTheDocument()
    expect(screen.getByLabelText(/completed/i)).toBeChecked()

    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).toContain('Workout')
  })

  it('starts a fresh plan on the next calendar day', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        days: {
          '2026-03-22': {
            dateKey: '2026-03-22',
            openedAt: '08:00',
            openedAtMinutes: 480,
            activities: [
              {
                id: 'a',
                title: 'Existing task',
                startTime: '08:30',
                endTime: '09:00',
                durationMinutes: 30,
                completed: false,
              },
            ],
          },
        },
      }),
    )

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 23, 7, 45))

    render(<App />)

    expect(screen.queryByText('Existing task')).not.toBeInTheDocument()
    expect(
      within(screen.getByLabelText(/planner summary/i)).getByText(/7:45/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/no activities yet/i)).toBeInTheDocument()
  })

  it('toggles dark mode and persists the selected theme', async () => {
    const user = userEvent.setup()
    render(<App />)

    const toggle = screen.getByRole('button', { name: /light mode/i })
    await user.click(toggle)

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('dayly-planner/theme')).toBe('dark')

    await user.click(screen.getByRole('button', { name: /dark mode/i }))

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('dayly-planner/theme')).toBe('light')
  })

  it('opens and closes the create activity popup', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /create activity/i }))
    expect(screen.getByRole('dialog', { name: /plan a block/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(
      screen.queryByRole('dialog', { name: /plan a block/i }),
    ).not.toBeInTheDocument()
  })

  it('prefills the next task start time from the previous task end time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 22, 9, 0))

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /create activity/i }))
    let dialog = screen.getByRole('dialog', { name: /plan a block/i })

    fireEvent.change(within(dialog).getByLabelText(/task or activity/i), {
      target: { value: 'First block' },
    })
    fireEvent.change(within(dialog).getByLabelText(/start time/i), {
      target: { value: '09:30' },
    })
    fireEvent.change(within(dialog).getByLabelText(/hours/i), {
      target: { value: '1' },
    })
    fireEvent.change(within(dialog).getByLabelText(/minutes/i), {
      target: { value: '15' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: /add to today/i }))

    fireEvent.click(screen.getByRole('button', { name: /create activity/i }))
    dialog = screen.getByRole('dialog', { name: /plan a block/i })

    expect(within(dialog).getByLabelText(/start time/i)).toHaveValue('10:45')
  })
})
