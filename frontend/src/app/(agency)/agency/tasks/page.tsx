"use client";

import React from "react";
import { Tabs } from "@/components/ui/tabs";
import { useTasks } from "@/hooks/useTasks";
import { useTaskCategories } from "@/hooks/useTaskCategories";
import { useAuth } from "@/components/auth/AuthProvider";
import { useTaskPageLogic } from "@/hooks/useTaskPageLogic";
import TaskForm from "@/components/tasks/TaskForm";
import TaskPageHeader from "@/components/tasks/TaskPageHeader";
import TaskTabNavigation from "@/components/tasks/TaskTabNavigation";
import TaskPageContent from "@/components/tasks/TaskPageContent";
import { useProfiles } from "@/contexts/ProfileContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const Tasks = () => {
  const { user } = useAuth();
  const { hasPermission, isLoading: profilesLoading } = useProfiles();
  const router = useRouter();

  // Permissions
  const canView = hasPermission("tasks", "view");
  const canCreate = hasPermission("tasks", "create");
  const canEdit = hasPermission("tasks", "edit");
  const canDelete = hasPermission("tasks", "delete");

  // Hooks must be called unconditionally at the top level
  const tasksData = useTasks();
  const categoriesData = useTaskCategories();

  // If hooks fail or don't return data as expected, provide fallbacks
  const tasks = tasksData?.tasks || [];
  const isLoading = tasksData?.isLoading || false;
  const createTask = tasksData?.createTask || (async () => null);
  const updateTask = tasksData?.updateTask || (async () => false);
  const deleteTask = tasksData?.deleteTask || (async () => false);
  const toggleTaskCompletion =
    tasksData?.toggleTaskCompletion || (async () => false);
  const bulkUpdateTasks = tasksData?.bulkUpdateTasks || (async () => false);

  const categories = categoriesData?.categories || [];
  const fallbackCreateCategories = React.useCallback(async () => {}, []);
  const createDefaultCategories =
    categoriesData?.createDefaultCategories || fallbackCreateCategories;

  const taskPageLogic = useTaskPageLogic({
    tasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    bulkUpdateTasks,
  });

  // Create default categories on first load if none exist
  React.useEffect(() => {
    if (categories.length === 0 && !isLoading) {
      createDefaultCategories();
    }
  }, [categories.length, isLoading, createDefaultCategories]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
          <p className="text-amber-800">
            You need to be signed in to manage your tasks. All tasks are saved
            to your account.
          </p>
        </div>
      </div>
    );
  }

  if (profilesLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view the tasks module. Please contact
            your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <TaskPageHeader
        pendingTodayTasksCount={taskPageLogic.pendingTodayTasks.length}
        totalTasksCount={tasks.length}
        onCreateTask={taskPageLogic.handleCreateTask}
        canCreate={canCreate}
      />

      <Tabs
        value={taskPageLogic.activeTab}
        onValueChange={taskPageLogic.setActiveTab}
        className="space-y-6">
        <TaskTabNavigation activeTab={taskPageLogic.activeTab} />

        <TaskPageContent
          tasks={tasks}
          todayTasks={taskPageLogic.todayTasks}
          onToggleComplete={taskPageLogic.toggleTaskCompletion}
          onEdit={taskPageLogic.handleEditTask}
          onDelete={taskPageLogic.handleDeleteTask}
          onBulkComplete={taskPageLogic.handleBulkComplete}
          onCreateTask={taskPageLogic.handleCreateTask}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </Tabs>

      <TaskForm
        isOpen={taskPageLogic.isTaskFormOpen}
        onClose={taskPageLogic.handleFormClose}
        onSubmit={taskPageLogic.handleFormSubmit}
        task={taskPageLogic.editingTask}
        initialDate={taskPageLogic.selectedDate || undefined}
      />
    </div>
  );
};

export default Tasks;
