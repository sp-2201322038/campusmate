# CampusMate

CampusMate is a student organizer web application for managing subjects, assignments, exams, deadlines, priorities, and completed tasks in one place.

## Current status

CampusMate is a working browser-based organizer for school and university students, with Subjects, Assignments, Exams, and Dashboard views.

## Implemented features

- **Subjects:** add and view subjects used to organize assignments and exams.
- **Assignments:** create and edit assignments linked to subjects, with optional deadlines and Low, Medium, or High priorities. Mark assignments as completed or active.
- **Search and filtering:** search assignment titles and filter by subject or overdue status; combine these controls to narrow results.
- **Exams:** add and view exams with a subject and required date.
- **Dashboard:** view active assignments, upcoming exams, subject counts, completion progress, overdue counts, and upcoming assignment and exam dates in chronological order.
- **Overdue tracking:** incomplete assignments with deadlines before the current local date are overdue. Assignments due today, completed assignments, and assignments without deadlines are not overdue.

## Data storage and limitations

Subjects, assignments, and exams are saved as JSON arrays in browser `localStorage` under `campusmate.subjects`, `campusmate.assignments`, and `campusmate.exams`. Valid saved records are restored after reload, and changes synchronize between tabs on the same origin.

Data stays in the current browser profile and origin (including the port). There is no backend, account system, cloud backup, or synchronization across devices. Clearing site data removes saved records; private browsing may discard them when the session ends.

If a save fails, changes remain in memory and a warning appears. Keep that tab open: unsaved changes are lost on reload or close. Conflicting changes from another tab can prevent saving until the conflicting records are reconciled.

Stored dates must be real calendar dates in `YYYY-MM-DD` format (years 0001–9999). Assignments may use an empty deadline. Records with malformed fields or invalid dates are excluded when loading; valid records remain unchanged. Loading does not rewrite storage, but the next successful save of that list omits excluded records.

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

# Check TypeScript without building the app
npm.cmd exec tsc -- -b

# Check TypeScript and create a production build in dist/
npm.cmd run build

# Preview the production build locally after building
npm.cmd run preview
```

The preview command serves the existing build locally; open the URL it prints. It is not a production hosting service.

Run the focused persistence and date-validation checks with:

```powershell
node --test tests/useStoredList.test.mjs
```
