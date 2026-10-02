# CampusMate

CampusMate is a student organizer web application for managing subjects, assignments, exams, deadlines, priorities, and completed tasks in one place.

## Target users

School and university students who want a clear overview of their coursework and upcoming responsibilities.

## Problem being solved

Academic tasks and deadlines are often scattered across notes, calendars, and learning platforms. CampusMate aims to help students keep track of their workload, decide what to work on next, and avoid missing deadlines.

## Planned main features

- Organize subjects and their related coursework.
- Track assignments and their due dates.
- Keep track of upcoming exams.
- View upcoming deadlines in one place.
- Set task priorities to plan work.
- Mark tasks as completed and review completed work.

## Current status

The project is at the initial setup stage using the Vite starter app. The features above are planned; no CampusMate product functionality has been implemented yet.

## Tech stack

- React for the user interface.
- TypeScript for typed application code.
- Vite for local development and production builds.

## Local development

### Prerequisites

- Node.js 20.19+ within the 20.x release line, or Node.js 22.12+.
- npm, included with Node.js.

### Install and start

Open a terminal in the project directory and run:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite in your browser (normally `http://localhost:5173`). Stop the development server with `Ctrl+C`.

These commands use `npm.cmd` for Windows PowerShell. On macOS or Linux, use `npm` instead.

### Other available commands

```powershell
# Run lint checks
npm.cmd run lint

# Check TypeScript and create a production build in dist/
npm.cmd run build

# Preview the production build locally after building
npm.cmd run preview
```
