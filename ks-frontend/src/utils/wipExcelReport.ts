import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

interface TimeEntry {
  date: string;
  lawyer: string;
  task: string;
  phase: string;
  description: string;
  hours: number;
  chargeRate: number;
  totalFee: number;
  source: string;
}

export const generateWIPExcelReport = async (matterId: string) => {
  try {
    // Fetch matter details
    const { data: matterData, error: matterError } = await supabase
      .from('matters')
      .select('title, lead_partner_id')
      .eq('id', matterId)
      .single();

    if (matterError) throw matterError;

    // Get lead partner name
    let leadPartnerName = 'Unknown Partner';
    if (matterData?.lead_partner_id) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', matterData.lead_partner_id)
        .single();
      leadPartnerName = profileData?.full_name || 'Unknown Partner';
    }

    // Fetch time entries using the matter_time_ledger view
    const { data: timeEntriesData, error: timeEntriesError } = await supabase
      .from('matter_time_ledger')
      .select('*')
      .eq('matter_id', matterId)
      .order('date', { ascending: false });

    if (timeEntriesError) throw timeEntriesError;

    // Format data for Excel export
    const excelData: TimeEntry[] = timeEntriesData?.map(entry => ({
      date: new Date(entry.date).toLocaleDateString(),
      lawyer: entry.lawyer_name || 'Demo User',
      task: entry.task_title || 'General',
      phase: entry.phase || 'General',
      description: entry.description || (entry.source === 'adjustment' ? 'Hours adjustment' : 'Time entry'),
      hours: Number(entry.hours),
      chargeRate: Number(entry.hourly_rate) || 850,
      totalFee: Number(entry.hours) * (Number(entry.hourly_rate) || 850),
      source: entry.source || 'manual'
    })) || [];

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create worksheet data with headers
    const worksheetData = [
      ['Work in Progress Report'],
      [`Matter: ${matterData?.title || 'Unknown Matter'}`],
      [`Lead Partner: ${leadPartnerName}`],
      [`Report Generated: ${new Date().toLocaleDateString()}`],
      [`Total Professional Fees: $${excelData.reduce((sum, entry) => sum + entry.totalFee, 0).toLocaleString()}`],
      [],
      ['Date', 'Lawyer', 'Task', 'Phase', 'Description', 'Hours', 'Charge Rate', 'Total Fee', 'Source'],
      ...excelData.map(entry => [
        entry.date,
        entry.lawyer,
        entry.task,
        entry.phase,
        entry.description,
        entry.hours,
        entry.chargeRate,
        entry.totalFee,
        entry.source
      ]),
      [],
      ['TOTALS', '', '', '', '', 
        excelData.reduce((sum, entry) => sum + entry.hours, 0).toFixed(2), 
        '', 
        excelData.reduce((sum, entry) => sum + entry.totalFee, 0).toFixed(2), 
        ''
      ]
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    ws['!cols'] = [
      { width: 12 }, // Date
      { width: 20 }, // Lawyer
      { width: 25 }, // Task
      { width: 15 }, // Phase
      { width: 40 }, // Description
      { width: 8 },  // Hours
      { width: 12 }, // Charge Rate
      { width: 12 }, // Total Fee
      { width: 10 }  // Source
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'WIP Report');

    // Generate filename
    const fileName = `WIP_Report_${matterData?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Matter'}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Save file
    XLSX.writeFile(wb, fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error('Error generating WIP Excel report:', error);
    throw error;
  }
};