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
  Zap
} from 'lucide-react';
import { Task } from '../lib/types.ts';
import Modal from './Modal.tsx';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/db';
import { formatDate, cn } from '../lib/utils';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import { generateAIContent } from '../lib/ai';

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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Task Management</h2>
          <p className="text-zinc-500 mt-1">Coordinate team activities and deadlines across the export lifecycle.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAIPrioritize}
            disabled={isPrioritizing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-all border border-emerald-100 disabled:opacity-50"
          >
            {isPrioritizing ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
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
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Task
        </button>
      </div>
    </header>

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
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Task Title</label>
            <input 
              required
              type="text" 
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="e.g. Verify FSSAI documents for Order #123"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</label>
            <textarea 
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[80px]"
              placeholder="Detailed instructions..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Priority</label>
              <select 
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Due Date</label>
              <input 
                required
                type="date" 
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button 
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingTask(null);
              }}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200 mr-2">
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                viewMode === 'list' ? "bg-white text-emerald-700 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              List
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                viewMode === 'kanban' ? "bg-white text-emerald-700 shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              Board
            </button>
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="inProgress">In Progress</option>
            <option value="done">Completed</option>
          </select>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-500 font-medium">Loading tasks...</p>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-zinc-400 text-sm font-medium">No tasks found matching your criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filteredTasks.map((task) => (
                <div key={task.id} className="p-6 hover:bg-zinc-50/50 transition-colors group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <button 
                        onClick={() => toggleTaskStatus(task)}
                        className={`mt-1 p-1 rounded-md transition-colors ${
                          task.status === 'done' 
                            ? 'text-emerald-500' 
                            : 'text-zinc-300 hover:text-emerald-500'
                        }`}
                      >
                        {task.status === 'done' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </button>
                      <div>
                        <h3 className={`text-base font-bold text-zinc-900 ${task.status === 'done' ? 'line-through text-zinc-400' : ''}`}>
                          {task.title}
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">{task.description}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <Calendar size={14} />
                            <span className="text-xs font-medium">
                              {formatDate(task.dueDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <User size={14} />
                            <span className="text-xs font-medium">Assigned to Me</span>
                          </div>
                          {task.priority === 'high' && task.status !== 'done' && (
                            <div className="flex items-center gap-1.5 text-rose-500">
                              <AlertCircle size={14} />
                              <span className="text-xs font-bold uppercase tracking-wider">High Priority</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEditTask(task)}
                        className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Edit Task"
                      >
                        <RefreshCw size={16} />
                      </button>
                      {deleteConfirmId === task.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1">
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="px-2 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-rose-700"
                          >
                            Del
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase rounded-lg hover:bg-zinc-200"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeleteConfirmId(task.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Delete Task"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['open', 'inProgress', 'done'].map((status) => (
            <div key={status} className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                  {status === 'open' ? 'To Do' : status === 'inProgress' ? 'In Progress' : 'Completed'}
                </h3>
                <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                  {filteredTasks.filter(t => t.status === status).length}
                </span>
              </div>
              <div className="flex flex-col gap-3 min-h-[500px] bg-zinc-50/50 p-3 rounded-2xl border border-dashed border-zinc-200">
                {filteredTasks.filter(t => t.status === status).map(task => (
                  <div 
                    key={task.id}
                    onClick={() => handleEditTask(task)}
                    className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                        task.priority === 'high' ? "bg-rose-50 text-rose-600" :
                        task.priority === 'medium' ? "bg-amber-50 text-amber-600" :
                        "bg-emerald-50 text-emerald-600"
                      )}>
                        {task.priority}
                      </span>
                      <button className="text-zinc-300 group-hover:text-zinc-500">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 mb-1">{task.title}</h4>
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{task.description}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Calendar size={12} />
                        <span className="text-[10px] font-medium">{formatDate(task.dueDate)}</span>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                        {profile?.displayName?.[0] || 'U'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
