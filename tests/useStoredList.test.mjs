import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

function loadModule(path, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const exports = {}
  vm.runInNewContext(outputText, { exports, ...globals })
  return exports
}

const { isSubject, isAssignment, isExam } = loadModule('../src/validation.ts')
const { isOverdue } = loadModule('../src/assignmentUtils.ts')
const { DateBadge, ReadableDate } = loadModule('../src/ui.tsx', { require: createRequire(import.meta.url) })
const assignment = { id: 'a', title: 'Homework', subjectId: 's', deadline: '', priority: 'Medium', completed: false }
const exam = { id: 'e', name: 'Final', subjectId: 's', date: '2026-10-15' }

test('stored dates require real calendar dates, including leap-year boundaries', () => {
  for (const [date, valid] of [
    ['2024-02-29', true], ['2000-02-29', true], ['2400-02-29', true],
    ['2026-02-28', true], ['2026-04-30', true], ['2026-12-31', true],
    ['0001-01-01', true], ['0099-12-31', true], ['9999-12-31', true],
    ['2026-02-29', false], ['1900-02-29', false], ['2100-02-29', false],
    ['2026-02-30', false], ['2026-04-31', false], ['2026-01-32', false],
    ['2026-00-10', false], ['2026-13-01', false], ['2026-01-00', false],
    ['0000-01-01', false], ['Invalid Date', false], ['not-a-date', false],
    ['2026-2-01', false], ['2026-02-1', false], [' 2026-02-01', false],
    ['2026-02-01 ', false], ['2026-02-01T00:00:00Z', false],
    ['2026-02-01\n', false], ['2026-02-01\r', false], ['2026-02-01\r\n', false],
    [null, false], [undefined, false], [20260201, false],
  ]) {
    assert.equal(isAssignment({ ...assignment, deadline: date }), valid, `assignment: ${date}`)
    assert.equal(isExam({ ...exam, date }), valid, `exam: ${date}`)
  }
  assert.equal(isAssignment(assignment), true)
  assert.equal(isExam({ ...exam, date: '' }), false)
})

test('valid deadlines retain overdue, completion and due-today behavior', () => {
  assert.equal(isOverdue({ ...assignment, deadline: '2024-02-29' }, '2024-03-01'), true)
  assert.equal(isOverdue({ ...assignment, deadline: '2024-03-01' }, '2024-03-01'), false)
  assert.equal(isOverdue({ ...assignment, deadline: '2024-03-02' }, '2024-03-01'), false)
  assert.equal(isOverdue({ ...assignment, deadline: '2024-02-29', completed: true }, '2024-03-01'), false)
  assert.equal(isOverdue(assignment, '2024-03-01'), false)
})

function createTabs(initial = [], key = 'campusmate.subjects', isValid = isSubject) {
  let stored = JSON.stringify(initial)
  const tabs = []
  return {
    records: () => JSON.parse(stored),
    tab() {
      const slots = []
      let cursor = 0
      let mounted = false
      let effects = []
      const listeners = new Set()
      const tab = { failWrites: false, failReads: false }
      const storage = {
        getItem() {
          if (tab.failReads) throw new Error('Storage unavailable')
          return stored
        },
        setItem(storageKey, value) {
          assert.equal(storageKey, key)
          if (tab.failWrites) throw new Error('QuotaExceededError')
          stored = value
        },
      }
      const react = {
        useState(initialValue) {
          const index = cursor++
          if (!(index in slots)) slots[index] = typeof initialValue === 'function' ? initialValue() : initialValue
          return [slots[index], (value) => { slots[index] = value }]
        },
        useRef(initialValue) {
          const index = cursor++
          if (!(index in slots)) slots[index] = { current: initialValue }
          return slots[index]
        },
        useCallback: (callback) => callback,
        useEffect: (effect) => { if (!mounted) effects.push(effect) },
      }
      const { useStoredList } = loadModule('../src/useStoredList.ts', {
        require: () => react,
        localStorage: storage,
        window: {
          addEventListener: (_, listener) => listeners.add(listener),
          removeEventListener: (_, listener) => listeners.delete(listener),
        },
      })
      tab.render = function useTestList() {
        cursor = 0
        const result = useStoredList(key, isValid)
        for (const effect of effects) effect()
        effects = []
        mounted = true
        return result
      }
      tab.update = (update) => tab.render()[1](update)
      tab.sync = (eventKey = key) => {
        for (const listener of listeners) listener({ storageArea: storage, key: eventKey })
      }
      tab.render()
      tabs.push(tab)
      return tab
    },
    sync() { for (const tab of tabs) tab.sync() },
  }
}

test('recovery preserves records independently created by both tabs', () => {
  const storage = createTabs()
  const a = storage.tab()
  const b = storage.tab()
  a.failWrites = true
  a.update((items) => [...items, { id: 'a', name: 'Math' }])
  assert.match(a.render()[2], /could not be saved/)
  b.update((items) => [...items, { id: 'b', name: 'Physics' }])
  storage.sync()
  assert.deepEqual(Array.from(a.render()[0], (item) => item.id), ['a'])
  a.failWrites = false
  a.update((items) => [...items, { id: 'c', name: 'Chemistry' }])
  assert.deepEqual(storage.records(), [
    { id: 'b', name: 'Physics' }, { id: 'a', name: 'Math' }, { id: 'c', name: 'Chemistry' },
  ])
  assert.equal(a.render()[2], null)
  storage.sync()
  assert.deepEqual(Array.from(b.render()[0], (item) => item.id), ['b', 'a', 'c'])
})

test('repeated failures retain local edits and latest remote edits until recovery', () => {
  const storage = createTabs([{ id: 'a', name: 'Math' }, { id: 'b', name: 'Physics' }])
  const a = storage.tab()
  const b = storage.tab()
  a.failWrites = true
  a.update((items) => items.map((item) => item.id === 'a' ? { ...item, name: 'Algebra' } : item))
  b.update((items) => items.map((item) => item.id === 'b' ? { ...item, name: 'Mechanics' } : item))
  a.update((items) => [...items, { id: 'c', name: 'Chemistry' }])
  a.failWrites = false
  a.update((items) => items)
  assert.deepEqual(storage.records(), [
    { id: 'a', name: 'Algebra' }, { id: 'b', name: 'Mechanics' }, { id: 'c', name: 'Chemistry' },
  ])
  assert.equal(a.render()[2], null)
})

test('conflicting edits preserve persisted and unsaved versions and warn', () => {
  const storage = createTabs([{ id: 'a', name: 'Math' }])
  const a = storage.tab()
  const b = storage.tab()
  a.failWrites = true
  a.update(() => [{ id: 'a', name: 'Algebra' }])
  b.update(() => [{ id: 'a', name: 'Geometry' }])
  a.failWrites = false
  a.update((items) => items)
  assert.deepEqual(storage.records(), [{ id: 'a', name: 'Geometry' }])
  assert.equal(a.render()[0][0].name, 'Algebra')
  assert.match(a.render()[2], /conflict/i)
  a.update(() => [{ id: 'a', name: 'Geometry' }])
  assert.equal(a.render()[2], null)
})

test('a failed fresh read prevents overwriting newer storage during recovery', () => {
  const storage = createTabs()
  const a = storage.tab()
  const b = storage.tab()
  a.failWrites = true
  a.update(() => [{ id: 'a', name: 'Math' }])
  b.update(() => [{ id: 'b', name: 'Physics' }])
  a.failWrites = false
  a.failReads = true
  a.update((items) => items)
  assert.deepEqual(storage.records(), [{ id: 'b', name: 'Physics' }])
  assert.ok(a.render()[2])
  a.failReads = false
  a.update((items) => items)
  assert.deepEqual(storage.records(), [{ id: 'b', name: 'Physics' }, { id: 'a', name: 'Math' }])
})

test('failed merge writes do not turn remote records into pending local mutations', () => {
  const storage = createTabs()
  const a = storage.tab()
  const b = storage.tab()
  a.failWrites = true
  a.update(() => [{ id: 'a', name: 'Math' }])
  b.update(() => [{ id: 'b', name: 'Physics' }])
  a.update((items) => items)
  b.update(() => [{ id: 'b', name: 'Mechanics' }])
  a.failWrites = false
  a.update((items) => items)
  assert.deepEqual(storage.records(), [{ id: 'b', name: 'Mechanics' }, { id: 'a', name: 'Math' }])
  assert.equal(a.render()[2], null)
})

for (const [name, local, remote, expected, conflict] of [
  ['local deletion of an unchanged record', [], [{ id: 'a', name: 'Math' }, { id: 'b', name: 'Physics' }], [{ id: 'b', name: 'Physics' }], false],
  ['remote deletion of a locally unchanged record', [{ id: 'a', name: 'Math' }, { id: 'c', name: 'Chemistry' }], [], [{ id: 'c', name: 'Chemistry' }], false],
  ['local edit versus remote deletion', [{ id: 'a', name: 'Algebra' }], [], [], true],
  ['local deletion versus remote edit', [], [{ id: 'a', name: 'Algebra' }], [{ id: 'a', name: 'Algebra' }], true],
  ['identical concurrent edits', [{ id: 'a', name: 'Algebra' }], [{ id: 'a', name: 'Algebra' }], [{ id: 'a', name: 'Algebra' }], false],
  ['concurrent creation with the same ID', [{ id: 'a', name: 'Math' }, { id: 'b', name: 'Biology' }], [{ id: 'a', name: 'Math' }, { id: 'b', name: 'Physics' }], [{ id: 'a', name: 'Math' }, { id: 'b', name: 'Physics' }], true],
]) {
  test(`recovery handles ${name}`, () => {
    const storage = createTabs([{ id: 'a', name: 'Math' }])
    const a = storage.tab()
    const b = storage.tab()
    a.failWrites = true
    a.update(() => local)
    b.update(() => remote)
    a.failWrites = false
    a.update((items) => items)
    assert.deepEqual(storage.records(), expected)
    if (conflict) {
      assert.match(a.render()[2], /conflict/i)
      assert.deepEqual(Array.from(a.render()[0]), local)
    } else {
      assert.equal(a.render()[2], null)
    }
  })
}

test('ordinary updates read the latest storage even before a storage event arrives', () => {
  const storage = createTabs()
  const a = storage.tab()
  const b = storage.tab()
  b.update(() => [{ id: 'b', name: 'Physics' }])
  a.update((items) => [...items, { id: 'a', name: 'Math' }])
  assert.deepEqual(storage.records(), [{ id: 'b', name: 'Physics' }, { id: 'a', name: 'Math' }])
  b.sync('unrelated.key')
  assert.equal(b.render()[0].length, 1)
  b.sync(null)
  assert.equal(b.render()[0].length, 2)
})

for (const [key, isValid, record] of [
  ['campusmate.subjects', isSubject, { id: 's', name: 'Math' }],
  ['campusmate.assignments', isAssignment, { id: 'a', title: 'Homework', subjectId: 's', deadline: '', priority: 'Medium', completed: false }],
  ['campusmate.exams', isExam, { id: 'e', name: 'Final', subjectId: 's', date: '2026-10-15' }],
]) {
  test(`${key}: existing arrays, ordinary saving, synchronization and quota recovery`, () => {
    const storage = createTabs([record], key, isValid)
    const a = storage.tab()
    const b = storage.tab()
    assert.equal(a.render()[0][0].id, record.id)
    a.update((items) => [...items, { ...record, id: 'new' }])
    storage.sync()
    assert.equal(b.render()[0].length, 2)
    b.failWrites = true
    b.update((items) => [...items, { ...record, id: 'pending' }])
    assert.ok(b.render()[2])
    b.failWrites = false
    b.update((items) => items)
    assert.equal(b.render()[2], null)
    assert.equal(storage.records().length, 3)
    storage.sync()
    assert.equal(a.render()[0].length, 3)
  })
}

for (const [key, isValid, record, field, DateComponent] of [
  ['campusmate.assignments', isAssignment, assignment, 'deadline', ReadableDate],
  ['campusmate.exams', isExam, exam, 'date', DateBadge],
]) {
  test(`${key}: invalid dates are excluded on load, sync and reload without changing valid records`, () => {
    const valid = { ...record, [field]: '2024-02-29' }
    const expected = field === 'deadline' ? [valid, { ...assignment, id: 'undated' }] : [valid]
    const initial = [
      ...expected,
      { ...record, id: 'impossible', [field]: '2026-02-30' },
      { ...record, id: 'malformed', [field]: 'Invalid Date' },
      { ...record, id: 'bad-month', [field]: '2026-13-01' },
    ]
    const storage = createTabs(initial, key, isValid)
    const a = storage.tab()
    const b = storage.tab()
    assert.deepEqual(Array.from(a.render()[0], (item) => ({ ...item })), expected)
    assert.deepEqual(storage.records(), initial)
    storage.sync()
    assert.deepEqual(Array.from(b.render()[0], (item) => ({ ...item })), expected)
    const markup = renderToStaticMarkup(createElement('div', null,
      ...a.render()[0].filter((item) => item[field]).map((item) =>
        createElement(DateComponent, { key: item.id, date: item[field] }))))
    assert.doesNotMatch(markup, /Invalid Date|2026-02-30|2026-13-01/)
    assert.match(markup, /datetime="2024-02-29"/i)
    a.update((items) => items)
    assert.deepEqual(storage.records(), expected)
    assert.deepEqual(Array.from(storage.tab().render()[0], (item) => ({ ...item })), expected)
  })
}
