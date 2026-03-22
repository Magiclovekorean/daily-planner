# Contributing

## Scope

This project is a small frontend application built with React, TypeScript, and Vite. Contributions should keep the app lightweight, browser-local, and focused on daily planning.

## Development Setup

1. Install dependencies:

```bash
bun install
```

2. Start the development server:

```bash
bun run dev
```

3. Run tests when changing behavior:

```bash
bun run test:run
```

4. Run linting before submitting changes:

```bash
bun run lint
```

## Contribution Guidelines

- Keep changes aligned with the current product scope: a daily planner stored locally in the browser
- Prefer small, focused pull requests
- Preserve existing behavior unless the change intentionally updates it
- Add or update tests when modifying validation, persistence, scheduling, or UI flows
- Avoid introducing backend dependencies unless there is a clear project decision to do so

## Code Style

- Use TypeScript for application logic
- Keep validation and planner rules in `src/planner.ts` when possible
- Keep UI logic in `src/App.tsx` unless a clear extraction improves readability
- Follow the existing ESLint configuration
- Prefer readable, explicit code over premature abstraction

## Testing Expectations

Changes should be validated with the relevant checks:

- `bun run lint`
- `bun run test:run`
- `bun run build`

If you change user-facing behavior, add or adjust tests in `src/App.test.tsx` or other relevant test files.

## Pull Request Notes

When opening a pull request, include:

- what changed
- why it changed
- how it was tested
- any known limitations or follow-up work

## Documentation

If you add new scripts, developer workflow changes, or product behavior, update [README.md](./README.md) and this file as needed.
