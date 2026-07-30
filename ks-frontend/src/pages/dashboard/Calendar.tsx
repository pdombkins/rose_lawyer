import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  type: 'meeting' | 'deadline' | 'court' | 'client-call';
  date: string;
  time: string;
  duration: number;
  location?: string;
  attendees?: string[];
  matter?: string;
  client?: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled';
}

export default function Calendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedProfile } = useProfile();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [matters, setMatters] = useState<{ id: string; title: string }[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<string>("all");

  useEffect(() => {
    fetchMatters();
    fetchEvents();
  }, [selectedProfile]);

  useEffect(() => {
    fetchEvents();
  }, [selectedMatter]);

  const fetchMatters = async () => {
    try {
      const { data } = await supabase
        .from('matters')
        .select('id, title')
        .eq('status', 'active')
        .order('title');
      
      setMatters(data || []);
    } catch (error) {
      console.error('Error fetching matters:', error);
    }
  };

  const fetchEvents = async () => {
    if (!selectedProfile?.id) return;
    
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', selectedProfile.id)
        .not('due_date', 'is', null);

      // Filter by matter if selected
      if (selectedMatter && selectedMatter !== "all") {
        query = query.eq('matter_id', selectedMatter);
      }

      const { data: tasks } = await query.order('due_date');

      // Fetch matter details separately for tasks
      const matterIds = [...new Set(tasks?.map(t => t.matter_id).filter(Boolean) || [])];
      const { data: mattersData } = await supabase
        .from('matters')
        .select('id, title, client_id')
        .in('id', matterIds);

      // Fetch client names separately
      const clientIds = [...new Set(mattersData?.map(m => m.client_id).filter(Boolean) || [])];
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      // Create lookup maps
      const clientsMap = new Map(clientsData?.map(c => [c.id, c.name]) || []);
      const mattersMap = new Map(mattersData?.map(m => [m.id, { title: m.title, clientName: clientsMap.get(m.client_id) }]) || []);

      const taskEvents = tasks?.map(task => {
        const matterInfo = mattersMap.get(task.matter_id);
        return {
          id: task.id,
          title: task.title,
          type: 'deadline' as const,
          date: task.due_date.split('T')[0],
          time: '17:00',
          duration: 0,
          matter: matterInfo?.title || 'Unknown Matter',
          client: matterInfo?.clientName || 'Unknown Client',
          priority: (task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)) as 'High' | 'Medium' | 'Low',
          status: task.status === 'completed' ? 'Completed' as const : 'Scheduled' as const
        };
      }) || [];

      setEvents(taskEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setEvents([]);
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-500';
      case 'deadline': return 'bg-red-500';
      case 'court': return 'bg-purple-500';
      case 'client-call': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Users className="w-4 h-4" />;
      case 'deadline': return <Clock className="w-4 h-4" />;
      case 'court': return <FileText className="w-4 h-4" />;
      case 'client-call': return <CalendarIcon className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const formatEventType = (type: string) => {
    switch (type) {
      case 'meeting': return 'Meeting';
      case 'deadline': return 'Deadline';
      case 'court': return 'Court Filing';
      case 'client-call': return 'Client Call';
      default: return 'Event';
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getEventsForDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  const getTodayEvents = () => {
    const today = formatDate(new Date());
    return events.filter(event => event.date === today);
  };

  const getUpcomingEvents = () => {
    const today = new Date();
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= today && eventDate <= oneWeekFromNow;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayEvents = getTodayEvents();
  const upcomingEvents = getUpcomingEvents();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div>
                <h1 className="font-serif text-2xl font-bold text-foreground">
                  Legal Calendar
                </h1>
                <p className="text-sm text-muted-foreground">Manage meetings, deadlines, and court dates</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select value={selectedMatter} onValueChange={(value) => {
                setSelectedMatter(value);
                fetchEvents();
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by matter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Matters</SelectItem>
                  {matters.map((matter) => (
                    <SelectItem key={matter.id} value={matter.id}>
                      {matter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button className="elegant-button" onClick={() => {
                toast({
                  title: "Schedule Event",
                  description: "Event scheduling feature would open here.",
                });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Event
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{todayEvents.length}</div>
                  <div className="text-sm text-muted-foreground">Today's Events</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {events.filter(e => e.type === 'deadline').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Upcoming Deadlines</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {events.filter(e => e.type === 'meeting').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Scheduled Meetings</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {events.filter(e => e.type === 'court').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Court Filings</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <Card className="premium-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-serif text-xl text-foreground">
                    {monthName}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before the first day of the month */}
                  {Array.from({ length: firstDayOfMonth }, (_, i) => (
                    <div key={`empty-${i}`} className="p-2 h-24"></div>
                  ))}
                  
                  {/* Days of the month */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                    const dayEvents = getEventsForDate(dateStr);
                    const isToday = dateStr === formatDate(new Date());
                    
                    return (
                      <div
                        key={day}
                        className={`p-2 h-24 border border-border rounded cursor-pointer hover:bg-accent/20 transition-colors ${
                          isToday ? 'bg-primary-burgundy/10 border-primary-burgundy' : ''
                        }`}
                        onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary-burgundy' : 'text-foreground'}`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className={`text-xs px-1 py-0.5 rounded text-white ${getEventTypeColor(event.type)}`}
                            >
                              {event.title.substring(0, 15)}...
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events */}
          <div className="space-y-6">
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-foreground">
                  Today's Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {todayEvents.map(event => (
                      <div key={event.id} className="p-3 border border-border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {getEventTypeIcon(event.type)}
                            <span className="font-medium text-foreground">{event.title}</span>
                          </div>
                          <Badge className={`text-white text-xs ${getPriorityColor(event.priority)}`}>
                            {event.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>{event.time} {event.duration > 0 && `(${event.duration}min)`}</div>
                          {event.location && <div>{event.location}</div>}
                          {event.client && <div>{event.client}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No events scheduled for today.</p>
                )}
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="font-serif text-xl text-foreground">
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="p-3 border border-border rounded-lg hover:bg-accent/20 cursor-pointer transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-white text-xs ${getEventTypeColor(event.type)}`}>
                            {formatEventType(event.type)}
                          </Badge>
                          <Badge className={`text-white text-xs ${getPriorityColor(event.priority)}`}>
                            {event.priority}
                          </Badge>
                        </div>
                      </div>
                      <h4 className="font-medium text-foreground mb-1">{event.title}</h4>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                          <span>{event.time}</span>
                          {event.duration > 0 && <span>({event.duration}min)</span>}
                        </div>
                        {event.location && <div className="mt-1">{event.location}</div>}
                        {event.client && <div className="mt-1">{event.client}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}