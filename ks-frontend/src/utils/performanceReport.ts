import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceReportData {
  matterName: string;
  leadPartner: string;
  client: string;
  startDate: string;
  endDate: string;
  duration: number; // business days
  tasksByStatus: { [key: string]: { count: number; estimatedHours: number; estimatedCosts: number; actualHours: number; actualCosts: number } };
  tasksByResource: { [key: string]: { count: number; estimatedHours: number; estimatedCosts: number; actualHours: number; actualCosts: number } };
  tasksByWorkstream: { [key: string]: { count: number; estimatedHours: number; estimatedCosts: number; actualHours: number; actualCosts: number } };
  totalActualRevenue: number;
  totalActualCosts: number;
  totalEstimatedRevenue: number;
  engagementMargin: number;
}

const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

export const generatePerformanceReport = async (matterId: string) => {
  try {
   // Get matter details including fee type
   const { data: matter, error: matterError } = await supabase
     .from('matters')
     .select(`
       title,
       start_date,
       end_date,
       fee_type,
       fixed_fee,
       lead_partner_id,
       clients(name)
     `)
     .eq('id', matterId)
     .single();

   if (matterError) throw matterError;

   // Get lead partner separately if lead_partner_id exists
   let leadPartnerName = 'Unknown Partner';
   if (matter?.lead_partner_id) {
     const { data: leadPartner } = await supabase
       .from('profiles')
       .select('full_name')
       .eq('id', matter.lead_partner_id)
       .single();
     
     if (leadPartner?.full_name) {
       leadPartnerName = leadPartner.full_name;
     }
   }

    // Calculate business days duration
    let duration = 0;
    if (matter?.start_date && matter?.end_date) {
      const startDate = new Date(matter.start_date);
      const endDate = new Date(matter.end_date);
      duration = calculateBusinessDays(startDate, endDate);
    }

    // Fetch tasks with assignments to get status and resource counts with estimated data
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        status,
        workstream,
        task_assignments(
          user_id,
          estimated_hours,
          profiles(full_name, hourly_rate, cost_rate)
        )
      `)
      .eq('matter_id', matterId);

    if (tasksError) throw tasksError;

    // Count tasks by status and resource with estimated hours and costs
    const tasksByStatus: { [key: string]: { count: number; estimatedHours: number; estimatedCosts: number; actualHours: number; actualCosts: number } } = {};
    const tasksByResource: { [key: string]: { count: number; estimatedHours: number; estimatedCosts: number; actualHours: number; actualCosts: number } } = {};
    const tasksByWorkstream: { [key: string]: { count: number; estimatedHours: number; estimatedCosts: number; actualHours: number; actualCosts: number } } = {};

    tasksData?.forEach(task => {
      // Count by status
      const status = task.status || 'Unknown';
      if (!tasksByStatus[status]) {
        tasksByStatus[status] = { count: 0, estimatedHours: 0, estimatedCosts: 0, actualHours: 0, actualCosts: 0 };
      }
      tasksByStatus[status].count += 1;

      // Count by workstream
      const workstream = task.workstream || 'Unassigned';
      if (!tasksByWorkstream[workstream]) {
        tasksByWorkstream[workstream] = { count: 0, estimatedHours: 0, estimatedCosts: 0, actualHours: 0, actualCosts: 0 };
      }
      tasksByWorkstream[workstream].count += 1;

      // Calculate estimated hours and costs for this task
      let taskEstimatedHours = 0;
      let taskEstimatedCosts = 0;
      
      task.task_assignments?.forEach(assignment => {
        const hours = Number(assignment.estimated_hours) || 0;
        const hourlyRate = assignment.profiles?.hourly_rate || 850; // Default rate
        const costRate = assignment.profiles?.cost_rate || (hourlyRate * 0.65);
        
        taskEstimatedHours += hours;
        taskEstimatedCosts += hours * costRate;
      });

      tasksByStatus[status].estimatedHours += taskEstimatedHours;
      tasksByStatus[status].estimatedCosts += taskEstimatedCosts;
      
      tasksByWorkstream[workstream].estimatedHours += taskEstimatedHours;
      tasksByWorkstream[workstream].estimatedCosts += taskEstimatedCosts;

      // Count by resource (unique users assigned to this task)
      const assignedUsers = task.task_assignments?.map(assignment => ({
        name: assignment.profiles?.full_name || 'Unknown',
        hours: Number(assignment.estimated_hours) || 0,
        hourlyRate: assignment.profiles?.hourly_rate || 850,
        costRate: assignment.profiles?.cost_rate || ((assignment.profiles?.hourly_rate || 850) * 0.65)
      })) || [];
      
      [...new Set(assignedUsers.map(u => u.name))].forEach(userName => {
        if (!tasksByResource[userName]) {
          tasksByResource[userName] = { count: 0, estimatedHours: 0, estimatedCosts: 0, actualHours: 0, actualCosts: 0 };
        }
        tasksByResource[userName].count += 1;
        
        // Sum estimated hours and costs for this user on this task
        const userAssignments = assignedUsers.filter(u => u.name === userName);
        userAssignments.forEach(assignment => {
          tasksByResource[userName].estimatedHours += assignment.hours;
          tasksByResource[userName].estimatedCosts += assignment.hours * assignment.costRate;
        });
      });
    });

    const { data: timeEntriesData, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select('hours, hourly_rate, user_id, task_id')
      .eq('matter_id', matterId);

    if (timeEntriesError) throw timeEntriesError;

    // Get cost rates and names for users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, cost_rate, hourly_rate');

    if (profilesError) throw profilesError;

    const profileMap = new Map(profilesData?.map(profile => [profile.id, profile]) || []);

    // Build task status map for aggregations
    const taskStatusMap = new Map((tasksData || []).map((t: any) => [t.id, t.status || 'Unknown']));
    const taskWorkstreamMap = new Map((tasksData || []).map((t: any) => [t.id, t.workstream || 'Unassigned']));

    let totalActualRevenue = 0;
    let totalActualCosts = 0;

    timeEntriesData?.forEach((entry: any) => {
      const hours = Number(entry.hours) || 0;
      const chargeRate = Number(entry.hourly_rate) || 0;
      const profile = profileMap.get(entry.user_id);
      const costRate = profile?.cost_rate || (profile?.hourly_rate ? profile.hourly_rate * 0.65 : chargeRate * 0.65);

      totalActualRevenue += hours * chargeRate;
      totalActualCosts += hours * costRate;

      // Aggregate by status
      const status = taskStatusMap.get(entry.task_id) || 'Unknown';
      if (!tasksByStatus[status]) {
        tasksByStatus[status] = { count: 0, estimatedHours: 0, estimatedCosts: 0, actualHours: 0, actualCosts: 0 };
      }
      tasksByStatus[status].actualHours += hours;
      tasksByStatus[status].actualCosts += hours * costRate;

      // Aggregate by resource
      const resourceName = profile?.full_name || 'Unknown';
      if (!tasksByResource[resourceName]) {
        tasksByResource[resourceName] = { count: 0, estimatedHours: 0, estimatedCosts: 0, actualHours: 0, actualCosts: 0 };
      }
      tasksByResource[resourceName].actualHours += hours;
      tasksByResource[resourceName].actualCosts += hours * costRate;

      // Aggregate by workstream
      const workstream = taskWorkstreamMap.get(entry.task_id) || 'Unassigned';
      if (!tasksByWorkstream[workstream]) {
        tasksByWorkstream[workstream] = { count: 0, estimatedHours: 0, estimatedCosts: 0, actualHours: 0, actualCosts: 0 };
      }
      tasksByWorkstream[workstream].actualHours += hours;
      tasksByWorkstream[workstream].actualCosts += hours * costRate;
    });

    // Calculate estimated revenue from task assignments
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('task_assignments')
      .select(`
        estimated_hours,
        user_id,
        tasks!inner(matter_id)
      `)
      .eq('tasks.matter_id', matterId);

    if (assignmentsError) throw assignmentsError;

    let totalEstimatedRevenue = 0;

    assignmentsData?.forEach(assignment => {
      const hours = Number(assignment.estimated_hours) || 0;
      const profile = profileMap.get(assignment.user_id);
      const chargeRate = profile?.hourly_rate || 850; // Default rate
      totalEstimatedRevenue += hours * chargeRate;
    });

    // Calculate engagement margin
    const engagementMargin = totalActualRevenue > 0 
      ? ((totalActualRevenue - totalActualCosts) / totalActualRevenue) * 100 
      : 0;

    const reportData: PerformanceReportData = {
      matterName: matter?.title || 'Unknown Matter',
      leadPartner: leadPartnerName,
      client: matter?.clients?.name || 'Unknown Client',
      startDate: matter?.start_date ? new Date(matter.start_date).toLocaleDateString() : 'Not set',
      endDate: matter?.end_date ? new Date(matter.end_date).toLocaleDateString() : 'Not set',
      duration,
      tasksByStatus,
      tasksByResource,
      tasksByWorkstream,
      totalActualRevenue,
      totalActualCosts,
      totalEstimatedRevenue,
      engagementMargin
    };

    // Create Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: "Performance Report",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          
          // Matter Information
          new Paragraph({
            children: [
              new TextRun({
                text: "MATTER INFORMATION",
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 400 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Matter Name: ${reportData.matterName}`,
                bold: true,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Lead Partner: ${reportData.leadPartner}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Client: ${reportData.client}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Start Date: ${reportData.startDate}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `End Date: ${reportData.endDate}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Fee Type: ${matter?.fee_type === 'fixed_fee' ? 'Fixed Fee' : 'Hourly Rates'}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          ...(matter?.fee_type === 'fixed_fee' && matter?.fixed_fee ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Fixed Fee Amount: $${matter.fixed_fee.toLocaleString()}`,
                  size: 20,
                  bold: true,
                }),
              ],
              spacing: { after: 200 },
            })
          ] : []),

          new Paragraph({
            children: [
              new TextRun({
                text: `Duration: ${reportData.duration} business days`,
                size: 20,
              }),
            ],
            spacing: { after: 600 },
          }),

          // Task Statistics
          new Paragraph({
            children: [
              new TextRun({
                text: "TASK STATISTICS",
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Tasks by Status Table
          new Paragraph({
            children: [
              new TextRun({
                text: "Tasks by Status:",
                bold: true,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Status", bold: true })],
                      alignment: AlignmentType.LEFT
                    })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Count", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Est. Hours", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Est. Costs", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Actual Hours", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Actual Costs", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                ],
              }),
              ...Object.entries(reportData.tasksByStatus).map(([status, data]) =>
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: status })],
                        alignment: AlignmentType.LEFT
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: data.count.toString() })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: data.estimatedHours.toFixed(1) })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: `$${data.estimatedCosts.toLocaleString()}` })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: data.actualHours.toFixed(1) })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: `$${data.actualCosts.toLocaleString()}` })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                  ],
                })
              ),
            ],
          }),

          // Tasks by Resource Table
          new Paragraph({
            children: [
              new TextRun({
                text: "Tasks by Resource:",
                bold: true,
                size: 20,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Resource", bold: true })],
                      alignment: AlignmentType.LEFT
                    })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Tasks", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Est. Hours", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Est. Costs", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Actual Hours", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Actual Costs", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                ],
              }),
              ...Object.entries(reportData.tasksByResource).map(([resource, data]) =>
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: resource })],
                        alignment: AlignmentType.LEFT
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: data.count.toString() })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: data.estimatedHours.toFixed(1) })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: `$${data.estimatedCosts.toLocaleString()}` })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: data.actualHours.toFixed(1) })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: `$${data.actualCosts.toLocaleString()}` })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                  ],
                })
              ),
            ],
          }),

          // Tasks by Workstream Table
          new Paragraph({
            children: [
              new TextRun({
                text: "Tasks by Workstream:",
                bold: true,
                size: 20,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Workstream", bold: true })],
                      alignment: AlignmentType.LEFT
                    })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Tasks", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Est. Hours", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Est. Costs", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Actual Hours", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: "Actual Costs", bold: true })],
                      alignment: AlignmentType.CENTER
                    })],
                  }),
                ],
              }),
              ...Object.entries(reportData.tasksByWorkstream).map(([workstream, data]) =>
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: workstream })],
                        alignment: AlignmentType.LEFT
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: data.count.toString() })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: data.estimatedHours.toFixed(1) })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: `$${data.estimatedCosts.toLocaleString()}` })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: data.actualHours.toFixed(1) })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: `$${data.actualCosts.toLocaleString()}` })],
                        alignment: AlignmentType.CENTER
                      })],
                    }),
                  ],
                })
              ),
            ],
          }),

          // Financial Performance
          new Paragraph({
            children: [
              new TextRun({
                text: "FINANCIAL PERFORMANCE",
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 600, after: 400 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Total Actual Revenue: $${reportData.totalActualRevenue.toLocaleString()}`,
                bold: true,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Total Actual Costs: $${reportData.totalActualCosts.toLocaleString()}`,
                bold: true,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Total Estimated Revenue: $${reportData.totalEstimatedRevenue.toLocaleString()}`,
                size: 20,
              }),
            ],
            spacing: { after: 200 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Engagement Margin: ${reportData.engagementMargin.toFixed(1)}%`,
                bold: true,
                size: 24,
                color: reportData.engagementMargin > 0 ? "228B22" : "DC143C",
              }),
            ],
            spacing: { after: 400 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Report Generated: ${new Date().toLocaleDateString()}`,
                size: 16,
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
          }),
        ],
      }],
    });

    // Generate and download the document
    const blob = await Packer.toBlob(doc);
    const fileName = `Performance_Report_${reportData.matterName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
    
    saveAs(blob, fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error('Error generating performance report:', error);
    throw error;
  }
};