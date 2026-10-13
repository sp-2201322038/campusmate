import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Assignment } from './models'
import { isOverdue } from './assignmentUtils'
import { useStoredList } from './useStoredList'
import { isAssignment, isExam, isSubject, validateRequiredText } from './validation'
import './App.css'

const views = ['Dashboard', 'Subjects', 'Assignments', 'Exams'] as const

function App() {
  const [activeView, setActiveView] = useState<typeof views[number]>('Dashboard')
  const [subjectName, setSubjectName] = useState('')
  const [subjects, setSubjects, subjectPersistenceError] = useStoredList('campusmate.subjects', isSubject)
  const [error, setError] = useState('')
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentSubjectId, setAssignmentSubjectId] = useState('')
  const [assignmentDeadline, setAssignmentDeadline] = useState('')
  const [assignmentPriority, setAssignmentPriority] = useState<Assignment['priority']>('Medium')
  const [assignments, setAssignments, assignmentPersistenceError] = useStoredList('campusmate.assignments', isAssignment)
  const [subjectFilterId, setSubjectFilterId] = useState('')
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const assignmentTitleRef = useRef<HTMLInputElement>(null)
  const [examName, setExamName] = useState('')
  const [examSubjectId, setExamSubjectId] = useState('')
  const [examDate, setExamDate] = useState('')
  const [exams, setExams, examPersistenceError] = useStoredList('campusmate.exams', isExam)
  const [examError, setExamError] = useState('')
  const persistenceError = subjectPersistenceError || assignmentPersistenceError || examPersistenceError

  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timer = window.setTimeout(() => setNow(new Date()), nextDay.getTime() - Date.now())
    return () => window.clearTimeout(timer)
  }, [now])

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const activeAssignments = assignments.filter((assignment) => !assignment.completed)
  const normalizedSearch = assignmentSearch.trim().toLowerCase()
  const filteredAssignments = assignments.filter((assignment) =>
    (!subjectFilterId || assignment.subjectId === subjectFilterId)
    && assignment.title.toLowerCase().includes(normalizedSearch)
    && (!overdueOnly || isOverdue(assignment, today)))
  const upcomingExams = exams.filter((exam) => exam.date >= today)
  const upcomingItems = [
    ...activeAssignments
      .filter((assignment) => assignment.deadline && assignment.deadline >= today)
      .map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        subjectId: assignment.subjectId,
        date: assignment.deadline,
        type: 'Assignment',
      })),
    ...upcomingExams.map((exam) => ({
      id: exam.id,
      title: exam.name,
      subjectId: exam.subjectId,
      date: exam.date,
      type: 'Exam',
    })),
  ].sort((first, second) => first.date.localeCompare(second.date))

  function addSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = subjectName.trim()
    const validationError = validateRequiredText(name, 'Enter a subject name.')

    if (validationError) {
      setError(validationError)
      return
    }

    setSubjects((current) => [...current, { id: crypto.randomUUID(), name }])
    setSubjectName('')
    setError('')
  }

  function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = assignmentTitle.trim()
    const validationError = validateRequiredText(title, 'Enter an assignment title.')

    if (validationError) {
      setAssignmentError(validationError)
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

  function addExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = examName.trim()
    const validationError = validateRequiredText(name, 'Enter an exam name.')
      || (!subjects.some((subject) => subject.id === examSubjectId) ? 'Select a subject.' : '')
      || validateRequiredText(examDate, 'Enter an exam date.')

    if (validationError) {
      setExamError(validationError)
      return
    }

    setExams((current) => [...current, {
      id: crypto.randomUUID(), name, subjectId: examSubjectId, date: examDate,
    }])
    setExamName('')
    setExamSubjectId('')
    setExamDate('')
    setExamError('')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>CampusMate</h1>
        <nav aria-label="Main navigation">
          {views.map((view) => (
            <button
              key={view}
              type="button"
              aria-current={activeView === view ? 'page' : undefined}
              onClick={() => setActiveView(view)}
            >
              {view}
            </button>
          ))}
        </nav>
      </header>
      <main className="workspace">
        {persistenceError && <p id="persistence-error" className="list-panel" role="alert">{persistenceError}</p>}
        <section className="dashboard workspace-view" hidden={activeView !== 'Dashboard'} aria-labelledby="dashboard-heading">
          <header className="view-heading">
            <h2 id="dashboard-heading">Dashboard</h2>
            <p>Your coursework at a glance.</p>
          </header>
          <dl className="dashboard-summary" aria-live="polite">
            <div className="summary-card">
              <dt>Active assignments</dt>
              <dd>
                {activeAssignments.length}
                <span className="summary-note">Not completed</span>
              </dd>
            </div>
            <div className="summary-card">
              <dt>Upcoming exams</dt>
              <dd>
                {upcomingExams.length}
                <span className="summary-note">Today and later</span>
              </dd>
            </div>
          </dl>
          <section className="list-panel" aria-labelledby="upcoming-heading">
            <h3 id="upcoming-heading">Upcoming deadlines</h3>
            <div aria-live="polite">
              {upcomingItems.length === 0 ? (
                <p className="dashboard-empty">
                  No upcoming deadlines. Add an assignment with a deadline or an exam to see it here.
                </p>
              ) : (
                <ol className="upcoming-list">
                  {upcomingItems.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <time className="deadline-date" dateTime={item.date} aria-label={item.date}>
                        <span className="deadline-day">{item.date.slice(8, 10)}</span>
                        <span>
                          {new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}
                          {' '}{item.date.slice(0, 4)}
                        </span>
                      </time>
                      <div className="deadline-details">
                        <strong>{item.title}</strong>
                        <p>{subjects.find((subject) => subject.id === item.subjectId)?.name}</p>
                      </div>
                      <span className={`deadline-type${item.type === 'Exam' ? ' exam' : ''}`}>{item.type}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </section>
        <section className="subjects-view workspace-view" hidden={activeView !== 'Subjects'} aria-labelledby="subjects-heading">
          <header className="view-heading">
            <h2 id="subjects-heading">Subjects</h2>
            <p>Keep your courses organized.</p>
          </header>
          <div className="view-grid">
            <div className="form-panel">
              <h3>Add subject</h3>
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
            </div>
            <section className="subjects-list list-panel" aria-labelledby="subject-list-heading">
              <h3 id="subject-list-heading">Your subjects</h3>
              {subjects.length === 0 ? (
                <p>No subjects added yet.</p>
              ) : (
                <ul className="subject-list" aria-live="polite">
                  {subjects.map((subject) => <li key={subject.id}>{subject.name}</li>)}
                </ul>
              )}
            </section>
          </div>
        </section>
        <section className="assignment-section workspace-view" hidden={activeView !== 'Assignments'} aria-labelledby="assignments-heading">
          <header className="view-heading">
            <h2 id="assignments-heading">Assignments</h2>
            <p>Track coursework, priorities, and progress.</p>
          </header>
          <div className="view-grid">
            <div className="form-panel">
              <h3>{editingAssignmentId ? 'Edit assignment' : 'Add assignment'}</h3>
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
            </div>
            <section className="list-panel" aria-labelledby="assignment-list-heading">
              <h3 id="assignment-list-heading">Your assignments</h3>
              <div className="assignment-filter">
                <label htmlFor="assignment-search">Search assignments</label>
                <input
                  id="assignment-search"
                  type="search"
                  placeholder="Search by title"
                  value={assignmentSearch}
                  onChange={(event) => setAssignmentSearch(event.target.value)}
                />
                <label htmlFor="assignment-subject-filter">Filter by subject</label>
                <select
                  id="assignment-subject-filter"
                  value={subjectFilterId}
                  onChange={(event) => setSubjectFilterId(event.target.value)}
                >
                  <option value="">All subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
                <label htmlFor="assignment-status-filter">Filter by status</label>
                <select
                  id="assignment-status-filter"
                  value={overdueOnly ? 'overdue' : 'all'}
                  onChange={(event) => setOverdueOnly(event.target.value === 'overdue')}
                >
                  <option value="all">All assignments</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              {filteredAssignments.length === 0 ? (
                <p role="status">
                  {overdueOnly
                    ? 'No overdue assignments found.'
                    : normalizedSearch
                    ? 'No assignments match your search.'
                    : subjectFilterId ? 'No assignments for this subject.' : 'No assignments added yet.'}
                </p>
              ) : (
                <ul className="assignment-list" aria-live="polite">
                  {filteredAssignments.map((assignment) => (
                    <li key={assignment.id} className={assignment.completed ? 'completed' : isOverdue(assignment, today) ? 'overdue' : undefined}>
                      <strong>{assignment.title}</strong>
                      <p>{subjects.find((subject) => subject.id === assignment.subjectId)?.name}</p>
                      <p>Priority: {assignment.priority}</p>
                      {assignment.deadline && (
                        <p>Deadline: <time dateTime={assignment.deadline}>{assignment.deadline}</time></p>
                      )}
                      <p className="assignment-status">{assignment.completed ? 'Completed' : isOverdue(assignment, today) ? 'Overdue' : 'Active'}</p>
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
          </div>
        </section>
        <section className="exam-section workspace-view" hidden={activeView !== 'Exams'} aria-labelledby="exams-heading">
          <header className="view-heading">
            <h2 id="exams-heading">Exams</h2>
            <p>Plan for your next exams.</p>
          </header>
          <div className="view-grid">
            <div className="form-panel">
              <h3>Add exam</h3>
              {subjects.length === 0 && <p>Add a subject before adding an exam.</p>}
              <form
                className="exam-form"
                aria-label="Add exam"
                aria-describedby={examError ? 'exam-error' : undefined}
                onSubmit={addExam}
              >
                <label htmlFor="exam-name">Exam name</label>
                <input
                  id="exam-name"
                  name="examName"
                  value={examName}
                  onChange={(event) => {
                    setExamName(event.target.value)
                    setExamError('')
                  }}
                  required
                />
                <label htmlFor="exam-subject">Subject</label>
                <select
                  id="exam-subject"
                  name="examSubjectId"
                  value={examSubjectId}
                  onChange={(event) => {
                    setExamSubjectId(event.target.value)
                    setExamError('')
                  }}
                  required
                  disabled={subjects.length === 0}
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
                <label htmlFor="exam-date">Exam date</label>
                <input
                  id="exam-date"
                  name="examDate"
                  type="date"
                  value={examDate}
                  onChange={(event) => {
                    setExamDate(event.target.value)
                    setExamError('')
                  }}
                  required
                />
                {examError && <p id="exam-error" role="alert">{examError}</p>}
                <button type="submit" disabled={subjects.length === 0}>Add exam</button>
              </form>
            </div>
            <section className="list-panel" aria-labelledby="exam-list-heading">
              <h3 id="exam-list-heading">Your exams</h3>
              {exams.length === 0 ? (
                <p>No exams added yet.</p>
              ) : (
                <ul className="exam-list" aria-live="polite">
                  {exams.map((exam) => (
                    <li key={exam.id}>
                      <strong>{exam.name}</strong>
                      <p>{subjects.find((subject) => subject.id === exam.subjectId)?.name}</p>
                      <p>Date: <time dateTime={exam.date}>{exam.date}</time></p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
