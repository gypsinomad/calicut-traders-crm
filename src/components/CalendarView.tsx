import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Filter,
  Search,
  X,
  Save,
  RefreshCw
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from 'date-fns';
import { CalendarEvent, Task, ExportOrder } from '../lib/types.ts';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/db';
import { useAuth } from './Auth.tsx';
import { Timestamp } from 'firebase/firestore';
import Modal from './Modal.tsx';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function CalendarView() {
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    type: 'meeting',
    isCommon: false,
    organization: profile?.organization || ''
  });

  const [startTime, setStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(format(addDays(new Date(), 0), "yyyy-MM-dd'T'HH:mm"));

  useEffect(() => {
    if (!profile?.organization) return;

    const unsubEvents = subscribeToCollection<CalendarEvent>(
      'calendar_events',
      (data) => setEvents(data),
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    const unsubTasks = subscribeToCollection<Task>(
      'tasks',
      (data) => setTasks(data),
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    const unsubOrders = subscribeToCollection<ExportOrder>(
      'orders',
      (data) => setOrders(data),
      [{ field: 'organization', operator: '==', value: profile.organization }]
    );

    setLoading(false);
    return () => {
      unsubEvents();
      unsubTasks();
      unsubOrders();
    };
  }, [profile?.organization]);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200 rounded-t-2xl">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-serif font-bold text-zinc-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-zinc-600"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-zinc-600"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl">
            <Filter size={14} className="text-zinc-400" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-600 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Events</option>
              <option value="meeting">Meetings</option>
              <option value="deadline">Deadlines</option>
              <option value="reminder">Reminders</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>
          <button 
            onClick={() => {
              setEditingEvent(null);
              setNewEvent({
                title: '',
                description: '',
                type: 'meeting',
                isCommon: false,
                organization: profile?.organization || ''
              });
              setStartTime(format(selectedDate, "yyyy-MM-dd'T'HH:mm"));
              setEndTime(format(selectedDate, "yyyy-MM-dd'T'HH:mm"));
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#064e3b] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-all shadow-lg shadow-emerald-900/10"
          >
            <Plus size={18} />
            Add Event
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/50">
        {days.map((day, idx) => (
          <div key={idx} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        
        // Combine all items for this day
        const dayEvents = events.filter(e => isSameDay(e.start instanceof Timestamp ? e.start.toDate() : new Date(e.start), day));
        const dayTasks = tasks.filter(t => isSameDay(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate), day));
        const dayOrders = orders.filter(o => o.paymentDueDate && isSameDay(o.paymentDueDate instanceof Timestamp ? o.paymentDueDate.toDate() : new Date(o.paymentDueDate), day));

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-[120px] p-2 border-r border-b border-zinc-100 transition-all relative group",
              !isSameMonth(day, monthStart) ? "bg-zinc-50/30 text-zinc-300" : "text-zinc-700",
              isSameDay(day, selectedDate) ? "bg-emerald-50/30" : "hover:bg-zinc-50/50",
              isSameDay(day, new Date()) && "bg-amber-50/20"
            )}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn(
                "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                isSameDay(day, new Date()) ? "bg-[#064e3b] text-white shadow-md shadow-emerald-900/20" : 
                isSameDay(day, selectedDate) ? "text-[#064e3b] font-black" : ""
              )}>
                {formattedDate}
              </span>
              {isSameDay(day, new Date()) && (
                <span className="text-[8px] font-black uppercase tracking-tighter text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Today</span>
              )}
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
              {dayEvents.map((event, idx) => (
                <div 
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEvent(event);
                    setNewEvent(event);
                    setStartTime(format(event.start instanceof Timestamp ? event.start.toDate() : new Date(event.start), "yyyy-MM-dd'T'HH:mm"));
                    setEndTime(format(event.end instanceof Timestamp ? event.end.toDate() : new Date(event.end), "yyyy-MM-dd'T'HH:mm"));
                    setIsModalOpen(true);
                  }}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold truncate cursor-pointer transition-all hover:scale-[1.02]",
                    event.type === 'meeting' ? "bg-blue-50 text-blue-700 border border-blue-100" :
                    event.type === 'deadline' ? "bg-rose-50 text-rose-700 border border-rose-100" :
                    event.type === 'compliance' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                    "bg-zinc-100 text-zinc-700 border border-zinc-200"
                  )}
                >
                  {event.title}
                </div>
              ))}
              {dayTasks.map((task, idx) => (
                <div 
                  key={task.id}
                  className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold truncate opacity-80"
                >
                  Task: {task.title}
                </div>
              ))}
              {dayOrders.map((order, idx) => (
                <div 
                  key={order.id}
                  className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-bold truncate opacity-80"
                >
                  Pay: {order.orderNumber}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-white">{rows}</div>;
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !startTime || !endTime || !profile?.uid || !profile?.organization) return;

    setIsSubmitting(true);
    try {
      const eventData = {
        ...newEvent,
        start: Timestamp.fromDate(new Date(startTime)),
        end: Timestamp.fromDate(new Date(endTime)),
        userId: profile.uid,
        organization: profile.organization,
        createdAt: Timestamp.now()
      };

      if (editingEvent) {
        await updateDocument('calendar_events', editingEvent.id, eventData);
      } else {
        await createDocument('calendar_events', eventData as CalendarEvent);
      }

      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent) return;
    try {
      await deleteDocument('calendar_events', editingEvent.id);
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-5xl font-serif font-bold text-zinc-900 tracking-tight">Global Calendar</h1>
        <p className="text-zinc-500 mt-2 text-lg font-serif italic">Synchronize deadlines, meetings, and compliance milestones.</p>
      </header>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl shadow-zinc-200/50 overflow-hidden">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
          <h3 className="text-xl font-serif font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <Clock className="text-emerald-600" size={20} />
            Upcoming for {format(selectedDate, 'MMMM do')}
          </h3>
          <div className="space-y-4">
            {[...events, ...tasks].filter(item => {
              const date = 'start' in item ? (item.start instanceof Timestamp ? item.start.toDate() : new Date(item.start)) : (item.dueDate instanceof Timestamp ? item.dueDate.toDate() : new Date(item.dueDate));
              return isSameDay(date, selectedDate);
            }).length === 0 ? (
              <div className="py-12 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                <p className="text-zinc-400 font-serif italic">No events scheduled for this day.</p>
              </div>
            ) : (
              [...events, ...tasks].filter(item => {
                const date = 'start' in item ? (item.start instanceof Timestamp ? item.start.toDate() : new Date(item.start)) : (item.dueDate instanceof Timestamp ? item.dueDate.toDate() : new Date(item.dueDate));
                return isSameDay(date, selectedDate);
              }).map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 group hover:bg-white hover:shadow-md transition-all">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm",
                    'type' in item ? (
                      item.type === 'meeting' ? "bg-blue-500" :
                      item.type === 'deadline' ? "bg-rose-500" :
                      item.type === 'compliance' ? "bg-amber-500" : "bg-zinc-500"
                    ) : "bg-emerald-500"
                  )}>
                    {'type' in item ? <CalendarIcon size={20} /> : <CheckCircle2 size={20} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-zinc-900">{item.title}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {'start' in item ? `${format(item.start instanceof Timestamp ? item.start.toDate() : new Date(item.start), 'HH:mm')} - ${format(item.end instanceof Timestamp ? item.end.toDate() : new Date(item.end), 'HH:mm')}` : 'All Day Task'}
                    </p>
                  </div>
                  {'type' in item && (
                    <button 
                      onClick={() => {
                        setEditingEvent(item as CalendarEvent);
                        setNewEvent(item as CalendarEvent);
                        setStartTime(format(item.start instanceof Timestamp ? item.start.toDate() : new Date(item.start), "yyyy-MM-dd'T'HH:mm"));
                        setEndTime(format(item.end instanceof Timestamp ? item.end.toDate() : new Date(item.end), "yyyy-MM-dd'T'HH:mm"));
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-zinc-400 hover:text-zinc-900 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreVertical size={18} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#064e3b] p-8 rounded-3xl text-white shadow-xl shadow-emerald-900/20">
          <h3 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
            <AlertCircle className="text-emerald-400" size={20} />
            Compliance Watch
          </h3>
          <div className="space-y-6">
            <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">FSSAI Renewal</span>
                <span className="text-[10px] font-bold bg-rose-500 px-2 py-0.5 rounded">Urgent</span>
              </div>
              <p className="text-sm font-medium">Main warehouse license expires in 12 days.</p>
            </div>
            <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">GST Filing</span>
                <span className="text-[10px] font-bold bg-amber-500 px-2 py-0.5 rounded">Pending</span>
              </div>
              <p className="text-sm font-medium">Monthly GSTR-1 return due by 11th.</p>
            </div>
            <button className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-900/20">
              View All Compliance
            </button>
          </div>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }} 
        title={editingEvent ? "Edit Event" : "Add Calendar Event"}
      >
        <form onSubmit={handleSaveEvent} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Event Title</label>
            <input 
              required
              type="text" 
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="e.g. Quality Inspection Meeting"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Description</label>
            <textarea 
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[80px]"
              placeholder="Meeting agenda or details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Start Time</label>
              <input 
                required
                type="datetime-local" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">End Time</label>
              <input 
                required
                type="datetime-local" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Type</label>
              <select 
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="reminder">Reminder</option>
                <option value="compliance">Compliance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Visibility</label>
              <select 
                value={newEvent.isCommon ? 'true' : 'false'}
                onChange={(e) => setNewEvent({ ...newEvent, isCommon: e.target.value === 'true' })}
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="false">Private (Only Me)</option>
                <option value="true">Common (Team)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
            {editingEvent && (
              <button 
                type="button"
                onClick={handleDeleteEvent}
                className="text-sm font-bold text-rose-500 hover:text-rose-700 transition-colors"
              >
                Delete Event
              </button>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <button 
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEvent(null);
                }}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-[#064e3b] text-white rounded-xl text-sm font-bold hover:bg-[#065f46] transition-all shadow-lg shadow-emerald-900/10 disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                {editingEvent ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
