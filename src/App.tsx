import { useState } from 'react'
import type { FormEvent } from 'react'
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
}

function App() {
  const [subjectName, setSubjectName] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [error, setError] = useState('')
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentSubjectId, setAssignmentSubjectId] = useState('')
  const [assignmentDeadline, setAssignmentDeadline] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentError, setAssignmentError] = useState('')

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

  function addAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = assignmentTitle.trim()

    if (!title) {
      setAssignmentError('Enter an assignment title.')
      return
    }

    if (!subjects.some((subject) => subject.id === assignmentSubjectId)) return

    setAssignments((current) => [...current, {
      id: crypto.randomUUID(),
      title,
      subjectId: assignmentSubjectId,
      deadline: assignmentDeadline,
    }])
    setAssignmentTitle('')
    setAssignmentDeadline('')
    setAssignmentError('')
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
        <form className="assignment-form" aria-label="Add assignment" onSubmit={addAssignment}>
          <label htmlFor="assignment-title">Assignment title</label>
          <input
            id="assignment-title"
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
          <label htmlFor="assignment-deadline">Deadline (optional)</label>
          <input
            id="assignment-deadline"
            name="assignmentDeadline"
            type="date"
            value={assignmentDeadline}
            onChange={(event) => setAssignmentDeadline(event.target.value)}
          />
          <button type="submit" disabled={subjects.length === 0}>Add assignment</button>
        </form>
        {assignments.length === 0 ? (
          <p>No assignments added yet.</p>
        ) : (
          <ul className="assignment-list" aria-live="polite">
            {assignments.map((assignment) => (
              <li key={assignment.id}>
                <strong>{assignment.title}</strong>
                <p>{subjects.find((subject) => subject.id === assignment.subjectId)?.name}</p>
                {assignment.deadline && (
                  <p>Deadline: <time dateTime={assignment.deadline}>{assignment.deadline}</time></p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
