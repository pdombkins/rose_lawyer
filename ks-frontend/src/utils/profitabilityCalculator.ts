import { supabase } from '@/integrations/supabase/client';

export interface ProfitabilityData {
  matterId: string;
  matterTitle: string;
  totalChargeRevenue: number;
  totalBaseCost: number;
  profitability: number; // Percentage: ((totalChargeRevenue / totalBaseCost) - 1) * 100
  totalHours: number;
  timeEntries: Array<{
    id: string;
    date: string;
    hours: number;
    chargeRate: number;
    costRate: number;
    chargeCost: number;
    baseCost: number;
    lawyerName: string;
    taskTitle: string;
  }>;
}

/**
 * Calculate profitability for a specific matter
 */
export const calculateMatterProfitability = async (matterId: string): Promise<ProfitabilityData> => {
  try {
    // Get matter details including fee type and fixed fee
    const { data: matterData, error: matterError } = await supabase
      .from('matters')
      .select('title, fee_type, fixed_fee')
      .eq('id', matterId)
      .single();

    if (matterError) throw matterError;

    // Get time entries with user profiles for cost rates
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('matter_time_ledger')
      .select('*')
      .eq('matter_id', matterId);

    if (timeEntriesError) throw timeEntriesError;

    // Get all user profiles to get cost rates
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, cost_rate, hourly_rate, full_name');

    if (profilesError) throw profilesError;

    const profileMap = new Map(profiles?.map(profile => [profile.id, profile]) || []);

    // Calculate profitability data
    let totalChargeRevenue = 0;
    let totalBaseCost = 0;
    let totalHours = 0;

    const processedEntries = timeEntries?.map(entry => {
      const profile = profileMap.get(entry.user_id);
      const hours = Number(entry.hours) || 0;
      const chargeRate = Number(entry.hourly_rate) || 850; // Default charge rate
      const costRate = profile?.cost_rate || chargeRate * 0.65; // Default to 65% of charge rate
      
      const chargeCost = hours * chargeRate;
      const baseCost = hours * costRate;
      
      totalChargeRevenue += chargeCost;
      totalBaseCost += baseCost;
      totalHours += hours;

      return {
        id: entry.entry_id,
        date: entry.date,
        hours,
        chargeRate,
        costRate,
        chargeCost,
        baseCost,
        lawyerName: entry.lawyer_name || profile?.full_name || 'Unknown',
        taskTitle: entry.task_title || 'General'
      };
    }) || [];

    // Calculate profitability based on fee type
    let profitability = 0;
    let actualChargeRevenue = totalChargeRevenue;

    if (matterData?.fee_type === 'fixed_fee' && matterData.fixed_fee) {
      // For fixed fee matters: (Fixed Fee - Estimated Costs)
      // Calculate estimated costs from task assignments
      const { data: taskAssignments } = await supabase
        .from('task_assignments')
        .select(`
          estimated_hours,
          user_id,
          tasks!inner(matter_id),
          profiles(cost_rate)
        `)
        .eq('tasks.matter_id', matterId);

      const estimatedCosts = (taskAssignments || []).reduce((sum, assignment) => {
        const costRate = assignment.profiles?.cost_rate || 0;
        return sum + (assignment.estimated_hours * costRate);
      }, 0);

      actualChargeRevenue = matterData.fixed_fee;
      profitability = estimatedCosts > 0 ? 
        ((actualChargeRevenue - estimatedCosts) / estimatedCosts) * 100 : 0;
    } else {
      // For hourly rate matters: standard calculation
      profitability = totalBaseCost > 0 ? 
        ((totalChargeRevenue / totalBaseCost) - 1) * 100 : 0;
    }

    return {
      matterId,
      matterTitle: matterData?.title || 'Unknown Matter',
      totalChargeRevenue: actualChargeRevenue,
      totalBaseCost,
      profitability,
      totalHours,
      timeEntries: processedEntries
    };
  } catch (error) {
    console.error('Error calculating matter profitability:', error);
    throw error;
  }
};

/**
 * Calculate profitability for multiple matters
 */
export const calculateMultipleMattersProfitability = async (matterIds: string[]): Promise<ProfitabilityData[]> => {
  const results = await Promise.all(
    matterIds.map(matterId => calculateMatterProfitability(matterId))
  );
  return results;
};

/**
 * Get profitability summary for all active matters
 */
export const getProfitabilitySummary = async () => {
  try {
    // Get all active matters
    const { data: matters, error: mattersError } = await supabase
      .from('matters')
      .select('id, title')
      .eq('status', 'active');

    if (mattersError) throw mattersError;

    if (!matters || matters.length === 0) {
      return {
        totalMatters: 0,
        profitableMatters: 0,
        averageProfitability: 0,
        totalRevenue: 0,
        totalCost: 0,
        mattersProfitability: []
      };
    }

    const matterIds = matters.map(matter => matter.id);
    const profitabilityData = await calculateMultipleMattersProfitability(matterIds);

    const profitableMatters = profitabilityData.filter(data => data.profitability > 0).length;
    const averageProfitability = profitabilityData.reduce((sum, data) => sum + data.profitability, 0) / profitabilityData.length;
    const totalRevenue = profitabilityData.reduce((sum, data) => sum + data.totalChargeRevenue, 0);
    const totalCost = profitabilityData.reduce((sum, data) => sum + data.totalBaseCost, 0);

    return {
      totalMatters: profitabilityData.length,
      profitableMatters,
      averageProfitability,
      totalRevenue,
      totalCost,
      mattersProfitability: profitabilityData.sort((a, b) => b.profitability - a.profitability)
    };
  } catch (error) {
    console.error('Error calculating profitability summary:', error);
    throw error;
  }
};