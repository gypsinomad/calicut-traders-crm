import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  CheckSquare, 
  Clock, 
  AlertCircle,
  User,
  MoreVertical,
  Calendar,
  CheckCircle2,
  Circle,
  RefreshCw,
  Save,
  X,
  Zap,
  Inbox
} from 'lucide-react';
import { Task } from '../lib/types.ts';
import Modal from './Modal.tsx';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/db';
import { formatDate, cn } from '../lib/utils';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import { generateAIContent } from '../lib/ai';
import { Skeleton } from './ui/Skeleton.tsx';

export default function TaskList() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dueDateStr, setDueDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [isPrioritizing, setIsPrioritizing] = useState(false);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    organization: profile?.organization || 'Global Trade Connect LLP'
  });

  useEffect(() => {
    const unsubscribe = subscribeToCollection<Task>('tasks', (data) => {
      setTasks(data);
      setLoading(false);
    }, undefined, 'dueDate', 'asc');

    return () => unsubscribe();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !dueDateStr) return;

    setIsSubmitting(true);
    try {
      const taskData = {
        ...newTask,
        dueDate: Timestamp.fromDate(new Date(dueDateStr)),
        assigneeId: profile?.uid || '',
        organization: profile?.organization || 'Calicut Traders'
      };

      if (editingTask) {
        await updateDocument('tasks', editingTask.id, taskData);
      } else {
        await createDocument('tasks', {
          ...taskData,
          createdAt: Timestamp.now(),
        } as Task);
      }

      setIsModalOpen(false);
      setEditingTask(null);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        status: 'open'
      });
      setDueDateStr(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteDocument('tasks', id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
    });
    if (task.dueDate) {
      const date = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);
      setDueDateStr(date.toISOString().split('T')[0]);
    }
    setIsModalOpen(true);
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'open' : 'done';
    try {
      await updateDocument('tasks', task.id, { status: newStatus });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleAIPrioritize = async () => {
    if (isPrioritizing || tasks.length === 0) return;
    setIsPrioritizing(true);
    
    try {
      const taskList = tasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate instanceof Timestamp ? t.dueDate.toDate().toISOString() : t.dueDate,
        status: t.status
      }));

      const prompt = `As a project manager for an export business, prioritize the following tasks. 
      Consider deadlines and priority levels (high/medium/low).
      Return a JSON array of task IDs in the recommended order of execution.
      
      Tasks: ${JSON.stringify(taskList)}
      `;

      const response = await generateAIContent('Task Prioritization', {
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const prioritizedIds = JSON.parse(response.text || '[]');
      if (Array.isArray(prioritizedIds)) {
        const sorted = [...tasks].sort((a, b) => {
          const indexA = prioritizedIds.indexOf(a.id);
          const indexB = prioritizedIds.indexOf(b.id);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setTasks(sorted);
      }
    } catch (error) {
      console.error('AI Prioritization error:', error);
    } finally {
      setIsPrioritizing(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = 
      (task.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (task.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || task.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">Operations</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-lg font-serif italic">Manage your daily workflow and export logistics.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                viewMode === 'list' 
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              List
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                viewMode === 'kanban' 
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              Board
            </button>
          </div>
          <button 
            onClick={handleAIPrioritize}
            disabled={isPrioritizing || tasks.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all shadow-sm disabled:opacity-50"
          >
            {isPrioritizing ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
            AI Prioritize
          </button>
          <button 
            onClick={() => {
              setEditingTask(null);
              setNewTask({
                title: '',
                description: '',
                priority: 'medium',
                status: 'open'
              });
              setDueDateStr(new Date().toISOString().split('T')[0]);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-8 py-3 bg-[#064e3b] text-white rounded-2xl text-sm font-bold hover:bg-[#065f46] transition-all shadow-xl shadow-emerald-900/20"
          >
            <Plus size={18} />
            New Task
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
          <input 
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-12 pr-10 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 appearance-none transition-all dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="inProgress">In Progress</option>
              <option value="done">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-6 flex items-start gap-4">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-4 pt-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-20 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-full text-zinc-300 dark:text-zinc-600">
                  <Inbox size={48} />
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-900 dark:text-white font-serif italic text-xl">No tasks found</p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">Stay organized by tracking your export operations here.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2 px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-sm font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
                >
                  Create Task
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredTasks.map((task) => (
                <div key={task.id} className="p-6 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <button 
                        onClick={() => toggleTaskStatus(task)}
                        className={cn(
                          "mt-1 p-0.5 rounded-md border-2 transition-all",
                          task.status === 'done'
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-zinc-300 dark:border-zinc-700 text-transparent hover:border-emerald-500"
                        )}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <div className="space-y-1">
                        <h4 className={cn(
                          "font-bold text-zinc-900 dark:text-white",
                          task.status === 'done' && "line-through text-zinc-400 dark:text-zinc-600"
                        )}>
                          {task.title}
                        </h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{task.description}</p>
                        <div className="flex flex-wrap items-center gap-4 pt-2">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            <Calendar size={14} />
                            {formatDate(task.dueDate)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              task.priority === 'high' ? "bg-rose-500" : task.priority === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                            )} />
                            <span className={cn(
                              task.priority === 'high' ? "text-rose-600 dark:text-rose-400" : task.priority === 'medium' ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            )}>
                              {task.priority}
                            </span>
                          </div>
                          {task.assigneeId && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                              <User size={14} />
                              {task.assigneeId === profile?.uid ? 'Me' : 'Team'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEditTask(task)}
                        className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 rounded-xl border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {['open', 'inProgress', 'done'].map((status) => (
            <div key={status} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'open' ? "bg-zinc-400" : status === 'inProgress' ? "bg-amber-500" : "bg-emerald-500"
                  )} />
                  {status === 'open' ? 'To Do' : status === 'inProgress' ? 'In Progress' : 'Completed'}
                  <span className="ml-1 text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {tasks.filter(t => t.status === status).length}
                  </span>
                </h3>
              </div>
              
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <div className="flex justify-between pt-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  ))
                ) : tasks.filter(t => t.status === status).length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium italic">No tasks here</p>
                  </div>
                ) : (
                  tasks
                    .filter(t => t.status === status)
                    .map((task) => (
                      <div 
                        key={task.id}
                        className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => handleEditTask(task)}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn(
                              "font-bold text-zinc-900 dark:text-white leading-tight",
                              task.status === 'done' && "line-through text-zinc-400 dark:text-zinc-600"
                            )}>
                              {task.title}
                            </h4>
                            <span className={cn(
                              "shrink-0 w-2 h-2 rounded-full mt-1.5",
                              task.priority === 'high' ? "bg-rose-500" : task.priority === 'medium' ? "bg-amber-500" : "bg-emerald-500"
                            )} />
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                              <Calendar size={12} />
                              {formatDate(task.dueDate)}
                            </div>
                            {task.assigneeId && (
                              <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400 border border-white dark:border-zinc-700">
                                {task.assigneeId === profile?.uid ? 'ME' : 'T'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }} 
        title={editingTask ? "Edit Task" : "Create New Task"}
      >
        <form onSubmit={handleCreateTask} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Task Title</label>
            <input 
              required
              type="text" 
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="e.g. Verify FSSAI documents for Order #123"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Description</label>
            <textarea 
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[100px]"
              placeholder="Detailed instructions..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Priority</label>
              <select 
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Due Date</label>
              <input 
                required
                type="date" 
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingTask(null);
              }}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
