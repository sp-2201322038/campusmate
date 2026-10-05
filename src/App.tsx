import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Subject = {
  id: string
  name: string
}

function App() {
  const [subjectName, setSubjectName] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [error, setError] = useState('')

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
    </main>
  )
}

export default App
