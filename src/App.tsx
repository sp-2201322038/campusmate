import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useStoredList } from './useStoredList'
import './App.css'

type Subject = {
  id: string
  name: string
}

type Assignment = {
  id: string
  title: string
  subjectId: string
  deadline: string
  priority: 'Low' | 'Medium' | 'High'
  completed: boolean
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function isSubject(value: unknown): value is Subject {
  if (typeof value !== 'object' || value === null) return false
  const subject = value as Record<string, unknown>
  return isNonEmptyString(subject.id) && isNonEmptyString(subject.name)
}

function isAssignment(value: unknown): value is Assignment {
  if (typeof value !== 'object' || value === null) return false
  const assignment = value as Record<string, unknown>
  return isNonEmptyString(assignment.id)
    && isNonEmptyString(assignment.title)
    && isNonEmptyString(assignment.subjectId)
    && typeof assignment.deadline === 'string'
    && typeof assignment.completed === 'boolean'
    && (assignment.priority === 'Low' || assignment.priority === 'Medium' || assignment.priority === 'High')
}

function App() {
  const [subjectName, setSubjectName] = useState('')
  const [subjects, setSubjects] = useStoredList('campusmate.subjects', isSubject)
  const [error, setError] = useState('')
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentSubjectId, setAssignmentSubjectId] = useState('')
  const [assignmentDeadline, setAssignmentDeadline] = useState('')
  const [assignmentPriority, setAssignmentPriority] = useState<Assignment['priority']>('Medium')
  const [assignments, setAssignments] = useStoredList('campusmate.assignments', isAssignment)
  const [assignmentError, setAssignmentError] = useState('')
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const assignmentTitleRef = useRef<HTMLInputElement>(null)

  function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = subjectName.trim()

    if (!name) {
      setError('Enter a subject name.')
      return
    }

    setSubjects((current) => [...current, { id: crypto.randomUUID(), name }])
    setSubjectName('')
    setError('')
  }

  function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = assignmentTitle.trim()

    if (!title) {
      setAssignmentError('Enter an assignment title.')
      return
    }

    if (!subjects.some((subject) => subject.id === assignmentSubjectId)) return

    const assignment = {
      id: editingAssignmentId ?? crypto.randomUUID(),
      title,
      subjectId: assignmentSubjectId,
      deadline: assignmentDeadline,
      priority: assignmentPriority,
    }
    setAssignments((current) => editingAssignmentId
      ? current.map((item) => item.id === editingAssignmentId ? { ...item, ...assignment } : item)
      : [...current, { ...assignment, completed: false }])
    resetAssignmentForm()
  }

  function editAssignment(assignment: Assignment) {
    setEditingAssignmentId(assignment.id)
    setAssignmentTitle(assignment.title)
    setAssignmentSubjectId(assignment.subjectId)
    setAssignmentDeadline(assignment.deadline)
    setAssignmentPriority(assignment.priority)
    setAssignmentError('')
    assignmentTitleRef.current?.focus()
  }

  function resetAssignmentForm() {
    setEditingAssignmentId(null)
    setAssignmentTitle('')
    setAssignmentDeadline('')
    setAssignmentPriority('Medium')
    setAssignmentError('')
    assignmentTitleRef.current?.focus()
  }

  function toggleAssignmentCompletion(id: string) {
    setAssignments((current) => current.map((assignment) => assignment.id === id
      ? { ...assignment, completed: !assignment.completed }
      : assignment))
  }

  return (
    <main className="subjects">
      <h1>CampusMate</h1>
      <form className="subject-form" onSubmit={addSubject}>
        <label htmlFor="subject-name">Subject name</label>
        <input
          id="subject-name"
          name="subjectName"
          value={subjectName}
          onChange={(event) => {
            setSubjectName(event.target.value)
            setError('')
          }}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'subject-error' : undefined}
        />
        {error && <p id="subject-error" role="alert">{error}</p>}
        <button type="submit">Add subject</button>
      </form>

      <section className="subjects-list" aria-labelledby="subjects-heading">
        <h2 id="subjects-heading">Subjects</h2>
        {subjects.length === 0 ? (
          <p>No subjects added yet.</p>
        ) : (
          <ul className="subject-list" aria-live="polite">
            {subjects.map((subject) => <li key={subject.id}>{subject.name}</li>)}
          </ul>
        )}
      </section>

      <section className="assignment-section" aria-labelledby="assignments-heading">
        <h2 id="assignments-heading">Assignments</h2>
        {subjects.length === 0 && <p>Add a subject before adding an assignment.</p>}
        <form
          className="assignment-form"
          aria-label={editingAssignmentId ? 'Edit assignment' : 'Add assignment'}
          onSubmit={saveAssignment}
        >
          <label htmlFor="assignment-title">Assignment title</label>
          <input
            id="assignment-title"
            ref={assignmentTitleRef}
            name="assignmentTitle"
            value={assignmentTitle}
            onChange={(event) => {
              setAssignmentTitle(event.target.value)
              setAssignmentError('')
            }}
            required
            aria-invalid={Boolean(assignmentError)}
            aria-describedby={assignmentError ? 'assignment-error' : undefined}
          />
          {assignmentError && <p id="assignment-error" role="alert">{assignmentError}</p>}
          <label htmlFor="assignment-subject">Subject</label>
          <select
            id="assignment-subject"
            name="assignmentSubjectId"
            value={assignmentSubjectId}
            onChange={(event) => setAssignmentSubjectId(event.target.value)}
            required
            disabled={subjects.length === 0}
          >
            <option value="">Select a subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <label htmlFor="assignment-priority">Priority</label>
          <select
            id="assignment-priority"
            name="assignmentPriority"
            value={assignmentPriority}
            onChange={(event) => setAssignmentPriority(event.target.value as Assignment['priority'])}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <label htmlFor="assignment-deadline">Deadline (optional)</label>
          <input
            id="assignment-deadline"
            name="assignmentDeadline"
            type="date"
            value={assignmentDeadline}
            onChange={(event) => setAssignmentDeadline(event.target.value)}
          />
          <button type="submit" disabled={subjects.length === 0}>
            {editingAssignmentId ? 'Save changes' : 'Add assignment'}
          </button>
          {editingAssignmentId && (
            <button type="button" onClick={resetAssignmentForm}>Cancel</button>
          )}
        </form>
        {assignments.length === 0 ? (
          <p>No assignments added yet.</p>
        ) : (
          <ul className="assignment-list" aria-live="polite">
            {assignments.map((assignment) => (
              <li key={assignment.id} className={assignment.completed ? 'completed' : undefined}>
                <strong>{assignment.title}</strong>
                <p>{subjects.find((subject) => subject.id === assignment.subjectId)?.name}</p>
                <p>Priority: {assignment.priority}</p>
                {assignment.deadline && (
                  <p>Deadline: <time dateTime={assignment.deadline}>{assignment.deadline}</time></p>
                )}
                <p className="assignment-status">{assignment.completed ? 'Completed' : 'Active'}</p>
                <button
                  type="button"
                  aria-label={`Edit ${assignment.title}`}
                  onClick={() => editAssignment(assignment)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`${assignment.completed ? 'Mark as active' : 'Mark as completed'}: ${assignment.title}`}
                  onClick={() => toggleAssignmentCompletion(assignment.id)}
                >
                  {assignment.completed ? 'Mark as active' : 'Mark as completed'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
