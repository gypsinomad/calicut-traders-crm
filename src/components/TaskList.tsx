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
  X
} from 'lucide-react';
import { Task } from '../lib/types.ts';
import Modal from './Modal.tsx';
import { subscribeToCollection, createDocument, updateDocument } from '../services/db';
import { formatDate } from '../lib/utils';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';

export default function TaskList() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dueDateStr, setDueDateStr] = useState(new Date().toISOString().split('T')[0]);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    organization: profile?.organization || 'Calicut Spice Traders LLP'
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
        createdAt: Timestamp.now(),
        assigneeId: profile?.uid || '',
        organization: profile?.organization || 'Calicut Spice Traders LLP'
      };
      await createDocument('tasks', taskData as Task);
      setIsModalOpen(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        status: 'open'
      });
      setDueDateStr(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'open' : 'done';
    try {
      await updateDocument('tasks', task.id, { status: newStatus });
    } catch (error) {
      console.error('Error updating task status:', error);
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
          <h2 className="text-3xl font-bold text-zinc-900">Tasks</h2>
          <p className="text-zinc-500 mt-1">Manage team activities and deadlines</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus size={18} />
          New Task
        </button>
      </header>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create New Task"
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
              onClick={() => setIsModalOpen(false)}
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
              Create Task
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
          <button className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>

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
                    <button className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
