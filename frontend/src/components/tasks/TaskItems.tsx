
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Task } from '@/types/task';
import TaskCard from './TaskCard';

interface TaskItemsProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const TaskItems: React.FC<TaskItemsProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}) => {
  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-600">What's on your mind today?</p>
          <p className="text-sm text-gray-500 mt-1">Add your first task to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Pending ({pendingTasks.length})
          </h3>
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Completed ({completedTasks.length})
          </h3>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskItems;
