import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";

interface Matter {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  client_name?: string;
}

interface GanttData {
  matter: Matter;
  startDate: Date;
  endDate: Date;
  duration: number;
  position: number;
  width: number;
}

export function MatterGanttChart() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [ganttData, setGanttData] = useState<GanttData[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatters();
  }, []);

  const loadMatters = async () => {
    try {
      setLoading(true);
      
      const { data: mattersData, error } = await supabase
        .from('matters')
        .select(`
          id,
          title,
          status,
          start_date,
          end_date,
          clients!inner(name)
        `)
        .eq('status', 'active')
        .not('start_date', 'is', null)
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching matters:', error);
        return;
      }

      const processedMatters: Matter[] = mattersData?.map(matter => ({
        ...matter,
        client_name: (matter.clients as any)?.name
      })) || [];

      setMatters(processedMatters);
      
      if (processedMatters.length > 0) {
        calculateGanttData(processedMatters);
      }
    } catch (error) {
      console.error('Error loading matters:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateGanttData = (mattersData: Matter[]) => {
    const validMatters = mattersData.filter(matter => matter.start_date);
    
    if (validMatters.length === 0) return;

    // Find the overall date range
    const startDates = validMatters.map(matter => new Date(matter.start_date!));
    const endDates = validMatters.map(matter => 
      matter.end_date ? new Date(matter.end_date) : new Date()
    );

    const minStart = new Date(Math.min(...startDates.map(d => d.getTime())));
    const maxEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
    
    // Extend range to full months for better visualization
    const rangeStart = startOfMonth(minStart);
    const rangeEnd = endOfMonth(maxEnd);
    const totalDays = differenceInDays(rangeEnd, rangeStart);

    setDateRange({ start: rangeStart, end: rangeEnd });

    // Calculate gantt data for each matter
    const ganttItems: GanttData[] = validMatters.map(matter => {
      const startDate = new Date(matter.start_date!);
      const endDate = matter.end_date ? new Date(matter.end_date) : new Date();
      
      const daysFromStart = differenceInDays(startDate, rangeStart);
      const duration = differenceInDays(endDate, startDate);
      
      const position = (daysFromStart / totalDays) * 100;
      const width = (duration / totalDays) * 100;

      return {
        matter,
        startDate,
        endDate,
        duration: Math.max(1, duration),
        position: Math.max(0, position),
        width: Math.max(1, width)
      };
    });

    setGanttData(ganttItems);
  };

  const getMonthHeaders = () => {
    if (!dateRange) return [];
    
    const months = eachMonthOfInterval({
      start: dateRange.start,
      end: dateRange.end
    });

    const totalDays = differenceInDays(dateRange.end, dateRange.start);

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const daysFromStart = differenceInDays(monthStart, dateRange.start);
      const monthDays = differenceInDays(monthEnd, monthStart) + 1;
      
      const position = (daysFromStart / totalDays) * 100;
      const width = (monthDays / totalDays) * 100;

      return {
        month,
        position,
        width,
        label: format(month, 'MMM yyyy')
      };
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'on hold': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Matters Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading matters timeline...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (matters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Matters Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">No active matters with start dates found</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Matters Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Month Headers */}
          <div className="relative h-8 border-b border-border">
            {getMonthHeaders().map((header, index) => (
              <div
                key={index}
                className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-muted-foreground border-r border-border/50"
                style={{
                  left: `${header.position}%`,
                  width: `${header.width}%`
                }}
              >
                {header.label}
              </div>
            ))}
          </div>

          {/* Gantt Bars */}
          <div className="space-y-3">
            {ganttData.map((item, index) => (
              <div key={item.matter.id} className="relative">
                <div className="flex items-center gap-4 min-h-[40px]">
                  {/* Matter Info */}
                  <div className="w-80 flex-shrink-0">
                    <div className="font-medium text-sm truncate" title={item.matter.title}>
                      {item.matter.title}
                    </div>
                    {item.matter.client_name && (
                      <div className="text-xs text-muted-foreground truncate" title={item.matter.client_name}>
                        {item.matter.client_name}
                      </div>
                    )}
                  </div>

                  {/* Gantt Bar Container */}
                  <div className="flex-1 relative h-6 bg-muted/30 rounded">
                    <div
                      className={`absolute h-full rounded ${getStatusColor(item.matter.status)} opacity-80 hover:opacity-100 transition-opacity`}
                      style={{
                        left: `${item.position}%`,
                        width: `${item.width}%`
                      }}
                      title={`${item.matter.title}: ${format(item.startDate, 'MMM dd, yyyy')} - ${format(item.endDate, 'MMM dd, yyyy')} (${item.duration} days)`}
                    />
                  </div>

                  {/* Duration */}
                  <div className="w-20 flex-shrink-0 text-right">
                    <Badge variant="outline" className="text-xs">
                      {item.duration}d
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <span className="text-sm font-medium">Status:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-xs">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-xs">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-xs">On Hold</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}