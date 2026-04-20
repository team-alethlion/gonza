"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Tabs } from "@/components/ui/tabs";
import { useTasks, useTaskSummary } from "@/hooks/useTasks";
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

const TasksClient = ({
  initialTasks,
  initialStats,
}: {
  initialTasks?: any[];
  initialStats?: any;
}) => {
  const { user } = useAuth();
  const { hasPermission, isLoading: profilesLoading } = useProfiles();
  const router = useRouter();

  // Permissions
  const canView = hasPermission("tasks", "view");
  const canCreate = hasPermission("tasks", "create");
  const canEdit = hasPermission("tasks", "edit");
  const canDelete = hasPermission("tasks", "delete");

  // Separate Hooks for Summary and List
  const {
    stats,
    isLoading: isStatsLoading,
    setFilters: setSummaryFilters
  } = useTaskSummary(initialStats);

  const {
    tasks,
    isLoading: isListLoading,
    searchTerm,
    setSearchTerm,
    filters: listFilters,
    setFilters: setListFilters,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    bulkUpdateTasks,
    bulkDeleteTasks,
    refreshTasks,
  } = useTasks(initialTasks);

  const categoriesData = useTaskCategories();
  const categories = categoriesData?.categories || [];
  const createDefaultCategories = categoriesData?.createDefaultCategories || (async () => {});

  const taskPageLogic = useTaskPageLogic({
    tasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    bulkUpdateTasks,
  });

  const hasCreatedDefaults = React.useRef(false);

  // Create default categories on first load if none exist
  React.useEffect(() => {
    if (categories.length === 0 && !isListLoading && !hasCreatedDefaults.current) {
      hasCreatedDefaults.current = true;
      createDefaultCategories();
    }
  }, [categories.length, isListLoading, createDefaultCategories]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
          <p className="text-amber-800">
            You need to be signed in to manage your tasks.
          </p>
        </div>
      </div>
    );
  }

  // Only block full page if no data at all
  if (profilesLoading || (isListLoading && tasks.length === 0)) {
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
            You do not have permission to view the tasks module.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/")} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <TaskPageHeader
        pendingTodayTasksCount={stats?.today_tasks - stats?.today_completed || 0}
        totalTasksCount={stats?.total_tasks || tasks.length}
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
          stats={stats}
          isStatsLoading={isStatsLoading}
          onToggleComplete={taskPageLogic.toggleTaskCompletion}
          onEdit={taskPageLogic.handleEditTask}
          onDelete={taskPageLogic.handleDeleteTask}
          onBulkComplete={taskPageLogic.handleBulkComplete}
          onBulkDelete={bulkDeleteTasks}
          onCreateTask={taskPageLogic.handleCreateTask}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
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

export default TasksClient;
