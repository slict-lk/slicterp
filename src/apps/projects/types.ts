// Projects & Tasks Module Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  startDate?: Date;
  endDate?: Date;
  budget?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  dueDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  projectId: string;
  taskId?: string;
  date: Date;
  hours: number;
  description?: string;
}
