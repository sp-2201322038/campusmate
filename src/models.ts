export type Subject = {
  id: string
  name: string
}

export type Assignment = {
  id: string
  title: string
  subjectId: string
  deadline: string
  priority: 'Low' | 'Medium' | 'High'
  completed: boolean
}

export type Exam = {
  id: string
  name: string
  subjectId: string
  date: string
}
