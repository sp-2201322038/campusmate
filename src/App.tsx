import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Assignment } from './models'
import { isOverdue } from './assignmentUtils'
import { useStoredList } from './useStoredList'
import { isAssignment, isExam, isSubject, validateRequiredText } from './validation'
import { DateBadge, EmptyState, Icon, ReadableDate } from './ui'
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
  const [feedback, setFeedback] = useState({ message: '', revision: 0 })

  function announce(message: string) {
    setFeedback((current) => ({ message, revision: current.revision + 1 }))
  }

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
  const completedCount = assignments.length - activeAssignments.length
  const overdueCount = activeAssignments.filter((assignment) => isOverdue(assignment, today)).length
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
    announce('Subject added.')
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
    announce(editingAssignmentId ? 'Assignment updated.' : 'Assignment added.')
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
    announce('Assignment status updated.')
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
    announce('Exam added.')
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to workspace</a>
      <header className="app-header">
        <nav aria-label="Main navigation">
          {views.map((view) => (
            <button
              key={view}
              type="button"
              aria-current={activeView === view ? 'page' : undefined}
              onClick={() => {
                setActiveView(view)
                setFeedback((current) => ({ ...current, message: '' }))
              }}
            >
              <span>{view}</span>
            </button>
          ))}
        </nav>
        <time dateTime={today}>
          {now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
        </time>
      </header>
      <main className="workspace" id="main-content" tabIndex={-1}>
        <div role="status" aria-live="polite" aria-atomic="true">
          {feedback.message && (
            <p className="save-feedback" key={feedback.revision}>
              <Icon name="check" />{feedback.message}
            </p>
          )}
        </div>
        {persistenceError && <p id="persistence-error" className="list-panel" role="alert">{persistenceError}</p>}
        <section className="dashboard workspace-view" hidden={activeView !== 'Dashboard'} aria-labelledby="dashboard-heading">
          <header className="view-heading">
            <h1 id="dashboard-heading">Dashboard</h1>
            <p>Your coursework at a glance.</p>
          </header>
          <dl className="dashboard-summary" aria-live="polite">
            <div className="summary-card">
              <dt>Active assignments</dt>
              <dd>
                {activeAssignments.length}
                {overdueCount > 0 && <span className="summary-note attention">{overdueCount} overdue</span>}
              </dd>
            </div>
            <div className="summary-card">
              <dt>Upcoming exams</dt>
              <dd>
                {upcomingExams.length}
                <span className="summary-note">From today onward</span>
              </dd>
            </div>
            <div className="summary-card">
              <dt>Your subjects</dt>
              <dd>
                {subjects.length}
              </dd>
            </div>
          </dl>
          <section className="list-panel upcoming-panel" aria-labelledby="upcoming-heading">
            <div className="panel-heading">
              <div>
                <h3 id="upcoming-heading">Upcoming deadlines</h3>
              </div>
              <span className="count-badge">{upcomingItems.length}</span>
            </div>
            <div aria-live="polite">
              {upcomingItems.length === 0 ? (
                <EmptyState title="No upcoming deadlines">
                  Assignments with a deadline and upcoming exams appear here.
                </EmptyState>
              ) : (
                <ol className="upcoming-list">
                  {upcomingItems.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <DateBadge date={item.date} />
                      <div className="deadline-details">
                        <strong>{item.title}</strong>
                        <p>{subjects.find((subject) => subject.id === item.subjectId)?.name}</p>
                        {item.date === today && <span className="due-today">Due today</span>}
                      </div>
                      <span className={`deadline-type${item.type === 'Exam' ? ' exam' : ''}`}>
                        {item.type}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
          <section className="list-panel progress-panel" aria-labelledby="progress-heading">
            <div className="panel-heading">
              <h3 id="progress-heading">Coursework progress</h3>
            </div>
            <p className="progress-number">{completedCount}<span> / {assignments.length}</span></p>
            <p className="progress-caption">Assignments completed</p>
            <progress value={completedCount} max={assignments.length || 1} aria-label="Completed assignments" />
            <dl className="progress-details">
              <div><dt>In progress</dt><dd>{activeAssignments.length}</dd></div>
              <div><dt>Overdue</dt><dd className={overdueCount ? 'attention' : undefined}>{overdueCount}</dd></div>
            </dl>
          </section>
        </section>
        <section className="subjects-view workspace-view" hidden={activeView !== 'Subjects'} aria-labelledby="subjects-heading">
          <header className="view-heading">
            <h1 id="subjects-heading">Subjects</h1>
            <p>Keep your courses organized.</p>
          </header>
          <div className="view-grid">
            <div className="form-panel">
              <div className="panel-heading">
                <h3>Add subject</h3>
              </div>
              <form className="subject-form" onSubmit={addSubject}>
                <label htmlFor="subject-name">Subject name</label>
                <input
                  id="subject-name"
                  name="subjectName"
                  placeholder="e.g. Linear algebra"
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
                <button type="submit"><Icon name="plus" />Add subject</button>
              </form>
            </div>
            <section className="subjects-list list-panel" aria-labelledby="subject-list-heading">
              <div className="panel-heading">
                <h3 id="subject-list-heading">Your subjects</h3>
                <span className="count-badge">{subjects.length}</span>
              </div>
              {subjects.length === 0 ? (
                <EmptyState title="No subjects yet">
                  Add a subject to organize your coursework.
                </EmptyState>
              ) : (
                <ul className="subject-list" aria-live="polite">
                  {subjects.map((subject, index) => (
                    <li key={subject.id}>
                      <span className="subject-number">{String(index + 1).padStart(2, '0')}</span>
                      <strong>{subject.name}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </section>
        <section className="assignment-section workspace-view" hidden={activeView !== 'Assignments'} aria-labelledby="assignments-heading">
          <header className="view-heading">
            <h1 id="assignments-heading">Assignments</h1>
            <p>Track coursework, priorities, and progress.</p>
          </header>
          <div className="view-grid">
            <div className="form-panel">
              <div className="panel-heading">
                <h3>{editingAssignmentId ? 'Edit assignment' : 'Add assignment'}</h3>
              </div>
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
                  placeholder="e.g. Problem set 04"
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
                <div className="field-pair">
                  <div className="form-field">
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
                  </div>
                  <div className="form-field">
                    <label htmlFor="assignment-deadline">Deadline <span className="optional">(optional)</span></label>
                    <input
                      id="assignment-deadline"
                      name="assignmentDeadline"
                      type="date"
                      value={assignmentDeadline}
                      onChange={(event) => setAssignmentDeadline(event.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" disabled={subjects.length === 0}>
                  <Icon name={editingAssignmentId ? 'check' : 'plus'} />
                  {editingAssignmentId ? 'Save changes' : 'Add assignment'}
                </button>
                {editingAssignmentId && (
                  <button type="button" onClick={resetAssignmentForm}>Cancel</button>
                )}
              </form>
            </div>
            <section className="list-panel" aria-labelledby="assignment-list-heading">
              <div className="panel-heading">
                <h3 id="assignment-list-heading">Your assignments</h3>
                <span className="count-badge">{filteredAssignments.length}</span>
              </div>
              <div className="assignment-filter">
                <div className="form-field">
                  <label htmlFor="assignment-search">Search assignments</label>
                  <input
                    id="assignment-search"
                    type="search"
                    placeholder="Search by title"
                    value={assignmentSearch}
                    onChange={(event) => setAssignmentSearch(event.target.value)}
                  />
                </div>
                <div className="form-field">
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
                </div>
                <div className="form-field">
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
              </div>
              {filteredAssignments.length === 0 ? (
                <div role="status">
                  <EmptyState title={assignments.length === 0 ? 'No assignments yet' : 'No matches'}>
                    {overdueOnly
                      ? 'No overdue assignments found.'
                      : normalizedSearch
                        ? 'No assignments match your search.'
                        : subjectFilterId ? 'No assignments for this subject.' : 'No assignments added yet.'}
                  </EmptyState>
                </div>
              ) : (
                <ul className="assignment-list" aria-live="polite">
                  {filteredAssignments.map((assignment) => (
                    <li key={assignment.id} className={assignment.completed ? 'completed' : isOverdue(assignment, today) ? 'overdue' : undefined}>
                      <div className="assignment-card-top">
                        <span className={`priority-badge priority-${assignment.priority.toLowerCase()}`}>{assignment.priority} priority</span>
                        <span className="assignment-status">{assignment.completed ? 'Completed' : isOverdue(assignment, today) ? 'Overdue' : 'Active'}</span>
                      </div>
                      <div className="assignment-details">
                        <strong>{assignment.title}</strong>
                        <p>{subjects.find((subject) => subject.id === assignment.subjectId)?.name}</p>
                        {assignment.deadline && (
                          <p className="card-date">
                            <span>Due <ReadableDate date={assignment.deadline} /></span>
                          </p>
                        )}
                      </div>
                      <div className="card-actions">
                        <button
                          type="button"
                          aria-label={`Edit ${assignment.title}`}
                          onClick={() => editAssignment(assignment)}
                        >
                          <Icon name="edit" />Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`${assignment.completed ? 'Mark as active' : 'Mark as completed'}: ${assignment.title}`}
                          onClick={() => toggleAssignmentCompletion(assignment.id)}
                        >
                          <Icon name={assignment.completed ? 'arrow' : 'check'} />
                          {assignment.completed ? 'Mark as active' : 'Mark as completed'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </section>
        <section className="exam-section workspace-view" hidden={activeView !== 'Exams'} aria-labelledby="exams-heading">
          <header className="view-heading">
            <h1 id="exams-heading">Exams</h1>
            <p>Plan for your next exams.</p>
          </header>
          <div className="view-grid">
            <div className="form-panel">
              <div className="panel-heading">
                <h3>Add exam</h3>
              </div>
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
                  placeholder="e.g. Midterm exam"
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
                <button type="submit" disabled={subjects.length === 0}><Icon name="plus" />Add exam</button>
              </form>
            </div>
            <section className="list-panel" aria-labelledby="exam-list-heading">
              <div className="panel-heading">
                <h3 id="exam-list-heading">Your exams</h3>
                <span className="count-badge">{exams.length}</span>
              </div>
              {exams.length === 0 ? (
                <EmptyState title="No exams yet">
                  Add an exam with its subject and date.
                </EmptyState>
              ) : (
                <ul className="exam-list" aria-live="polite">
                  {exams.map((exam) => (
                    <li key={exam.id}>
                      <DateBadge date={exam.date} />
                      <div className="exam-details">
                        <strong>{exam.name}</strong>
                        <p>{subjects.find((subject) => subject.id === exam.subjectId)?.name}</p>
                      </div>
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
