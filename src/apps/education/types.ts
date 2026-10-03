// PHASE 4: Education Module Types

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  credits?: number;
  duration?: number; // in hours
  instructorId?: string;
  category?: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  maxStudents?: number;
  isPublished: boolean;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  content: string;
  sequence: number;
  duration?: number; // in minutes
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
  videoUrl?: string;
  attachments?: Attachment[];
}

export interface Attachment {
  filename: string;
  url: string;
  size: number;
  type: string;
}

export interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  enrollmentDate: Date;
  status: 'ACTIVE' | 'GRADUATED' | 'SUSPENDED' | 'WITHDRAWN';
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'DROPPED' | 'FAILED';
  enrollmentDate: Date;
  completionDate?: Date;
  progress: number; // 0-100
  grade?: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  description: string;
  dueDate: Date;
  maxScore: number;
  submissions?: AssignmentSubmission[];
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: Date;
  content: string;
  attachments?: Attachment[];
  score?: number;
  feedback?: string;
  status: 'SUBMITTED' | 'GRADED' | 'LATE';
}

export interface Quiz {
  id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  duration?: number; // in minutes
  passingScore: number;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  options?: string[];
  correctAnswer: string | string[];
  points: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  startedAt: Date;
  completedAt?: Date;
  answers: Record<string, string>;
  score?: number;
  passed: boolean;
}

export interface GradeBook {
  studentId: string;
  courseId: string;
  assignments: GradeItem[];
  quizzes: GradeItem[];
  finalGrade?: string;
  gpa?: number;
}

export interface GradeItem {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  date: Date;
}
