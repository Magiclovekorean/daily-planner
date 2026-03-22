# Dayly Planner

Dayly Planner is a small React application for planning the current day from the moment you open it. It creates a fresh plan per calendar day, stores activities in `localStorage`, and keeps the agenda focused on today's schedule.

## Features

- Create activities with a title, start time, and duration
- Automatically suggest the next start time from the previous activity
- Prevent activities from starting before the app was first opened that day
- Persist the daily plan and completion state in `localStorage`
- Reset the schedule automatically on a new calendar day
- Toggle between light and dark themes

## Tech Stack

- React 19
- TypeScript
- Vite
- Vitest and Testing Library
- ESLint

## Getting Started

### Prerequisites

- Bun (latest stable version recommended)

### Install dependencies

```bash
bun install
```

### Start the development server

```bash
bun run dev
```

### Build for production

```bash
bun run build
```

### Preview the production build

```bash
bun run preview
```

## Available Scripts

- `bun run dev`: start the Vite development server
- `bun run build`: run TypeScript project builds and create the production bundle
- `bun run lint`: run ESLint across the project
- `bun run test`: start Vitest in watch mode
- `bun run test:run`: run the test suite once
- `bun run preview`: serve the production build locally

## How It Works

The app stores planner data in `localStorage` under a project-specific key. Each day gets its own plan keyed by date.

When the app opens:

1. It checks whether a plan already exists for the current date.
2. If not, it creates a new empty plan and records the current opening time.
3. New activities must start at or after that opening time.
4. Activities are sorted by start time and restored on reload.

This makes the planner intentionally day-scoped and browser-local, with no server dependency.

## Project Structure

```text
src/
  App.tsx         Main UI and interaction logic
  planner.ts      Planner domain logic, validation, formatting, storage helpers
  App.test.tsx    Integration-style UI tests
  test/setup.ts   Vitest test setup
public/           Static assets
```

## Testing

Run the full test suite once with:

```bash
bun run test:run
```

The current tests cover:

- creating a new plan and adding activities
- validation for invalid start times
- persistence of activities and completion state
- rollover to a fresh plan on a new day
- theme toggling
- modal open and close behavior
- next-start-time prefilling

## Contributing

See [Contributing.md](./Contributing.md) for contribution workflow, coding expectations, and verification steps.
