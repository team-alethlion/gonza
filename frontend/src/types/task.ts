export interface Task {
  id: string;
  user_id: string;
  location_id: string | null;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  due_date: string;
  category: string | null;
  completed: boolean;
  completed_at: string | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  created_at: string;
  updated_at: string;
  is_recurring: boolean;
  recurrence_type: 'daily' | 'weekly' | 'monthly' | null;
  recurrence_end_date: string | null;
  parent_task_id: string | null;
  recurrence_count: number;
}

export interface TaskCategory {
  id: string;
  user_id: string;
  location_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High';
  due_date: string;
  category?: string;
  reminder_enabled?: boolean;
  reminder_time?: string;
  is_recurring?: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'monthly';
  recurrence_end_date?: string;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  completed?: boolean;
  completed_at?: string | null;
}

export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface TaskFilters {
  status: 'all' | 'pending' | 'completed';
  priority: TaskPriority | 'all';
  category: string | 'all';
  search: string;
}
