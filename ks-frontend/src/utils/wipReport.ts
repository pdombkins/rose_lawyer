import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

interface WIPReportData {
  matterTitle: string;
  leadPartner: string;
  timeEntries: {
    date: string;
    lawyer: string;
    task: string;
    phase: string;
    description: string;
    hours: number;
    chargeRate: number;
    chargeCost: number;
    source: string;
  }[];
  totalChargeCost: number;
}

export const generateWIPReport = async (matterId: string) => {
  try {
  // Fetch matter details - simplified to avoid relation issues
  const { data: matterData, error: matterError } = await supabase
    .from('matters')
    .select('title, lead_partner_id')
    .eq('id', matterId)
    .single();

  if (matterError) throw matterError;

  // Get lead partner profile separately
  let leadPartnerName = 'Unknown Partner';
  if (matterData?.lead_partner_id) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', matterData.lead_partner_id)
      .single();
    leadPartnerName = profileData?.full_name || 'Unknown Partner';
  }

  // Use the matter_time_ledger view for comprehensive time entry data
  const { data: timeEntriesData, error: timeEntriesError } = await supabase
    .from('matter_time_ledger')
    .select('*')
    .eq('matter_id', matterId)
    .order('date', { ascending: false });

  if (timeEntriesError) throw timeEntriesError;

  // Get cost rates from profiles
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, cost_rate, hourly_rate');

  if (profilesError) throw profilesError;

  const profileMap = new Map(profilesData?.map(profile => [profile.id, profile]) || []);

  // Format data for report
  const reportData: WIPReportData = {
    matterTitle: matterData?.title || 'Unknown Matter',
    leadPartner: leadPartnerName,
    timeEntries: timeEntriesData?.map(entry => {
      const profile = profileMap.get(entry.user_id);
      const chargeRate = Number(entry.hourly_rate) || 850;
      const costRate = profile?.cost_rate || chargeRate * 0.65;
      const hours = Number(entry.hours);
      
      return {
        date: new Date(entry.date).toLocaleDateString(),
        lawyer: entry.lawyer_name || 'Demo User',
        task: entry.task_title || 'General',
        phase: entry.phase || 'General',
        description: entry.description || (entry.source === 'adjustment' ? 'Hours adjustment' : 'Time entry'),
        hours: hours,
        chargeRate: chargeRate,
        chargeCost: hours * chargeRate,
        source: entry.source || 'manual'
      };
    }) || [],
    totalChargeCost: 0
  };

  // Calculate total charge cost
  reportData.totalChargeCost = reportData.timeEntries.reduce((sum, entry) => sum + entry.chargeCost, 0);

    // Group entries by task and phase
    const groupedEntries = reportData.timeEntries.reduce((acc, entry) => {
      const key = `${entry.task} - ${entry.phase}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(entry);
      return acc;
    }, {} as Record<string, typeof reportData.timeEntries>);

    // Create Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: "Work in Progress Report",
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Matter details
          new Paragraph({
            children: [
              new TextRun({
                text: `Matter: ${reportData.matterTitle}`,
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `Lead Partner: ${reportData.leadPartner}`,
                bold: true,
                size: 24,
              }),
            ],
            spacing: { after: 400 },
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `Report Generated: ${new Date().toLocaleDateString()}`,
                size: 20,
              }),
            ],
            spacing: { after: 400 },
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: `Total Professional Fees: $${reportData.totalChargeCost.toLocaleString()}`,
                size: 20,
                bold: true,
              }),
            ],
            spacing: { after: 600 },
          }),

          // Summary table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                  }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Lawyer", bold: true })] })],
                      width: { size: 15, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Task/Phase", bold: true })] })],
                      width: { size: 15, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })],
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Hours", bold: true })] })],
                      width: { size: 10, type: WidthType.PERCENTAGE },
                    }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Charge Rate", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Professional Fees", bold: true })] })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              
              // Data rows grouped by task/phase
              ...Object.entries(groupedEntries).flatMap(([taskPhase, entries]) => [
                // Group header
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: taskPhase, bold: true, italics: true })] 
                      })],
                      columnSpan: 7,
                    }),
                  ],
                }),
                
                // Entries for this group
                ...entries.map(entry => new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: entry.date })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: entry.lawyer })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: `${entry.task} - ${entry.phase}` })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: entry.description })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: entry.hours.toFixed(2) })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: `$${entry.chargeRate}/h` })] })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: `$${entry.chargeCost.toLocaleString()}` })] })],
                    }),
                  ],
                }))
              ]),
              
                // Total row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "TOTAL", bold: true })] })],
                    columnSpan: 4,
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ 
                        text: reportData.timeEntries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(2),
                        bold: true 
                      })] 
                    })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ 
                        text: `$${reportData.totalChargeCost.toLocaleString()}`,
                        bold: true 
                      })] 
                    })],
                  }),
                ],
              }),
            ],
          }),
        ],
      }],
    });

    // Generate and download the document
    const buffer = await Packer.toBuffer(doc);
    const fileName = `WIP_Report_${reportData.matterTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
    
    saveAs(new Blob([new Uint8Array(buffer).buffer]), fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error('Error generating WIP report:', error);
    throw error;
  }
};