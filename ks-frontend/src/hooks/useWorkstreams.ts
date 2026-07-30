import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WorkstreamsAndPhases {
  workstreams: string[];
  phases: string[];
}

async function fetchWorkstreamsAndPhases(): Promise<WorkstreamsAndPhases> {
  // Fetch unique workstreams from active matters
  const { data: workstreamsData } = await supabase
    .from('tasks')
    .select('workstream, matters!inner(status)')
    .eq('matters.status', 'active')
    .not('workstream', 'is', null)
    .neq('workstream', '');

  // Fetch unique phases from active matters
  const { data: phasesData } = await supabase
    .from('tasks')
    .select('phase, matters!inner(status)')
    .eq('matters.status', 'active')
    .not('phase', 'is', null)
    .neq('phase', '');

  const uniqueWorkstreams = [...new Set(
    (workstreamsData || []).map((item: any) => item.workstream).filter(Boolean)
  )].sort();

  const uniquePhases = [...new Set(
    (phasesData || []).map((item: any) => item.phase).filter(Boolean)
  )].sort();

  return {
    workstreams: uniqueWorkstreams,
    phases: uniquePhases,
  };
}

/**
 * Cached workstreams and phases hook using TanStack Query
 * - Caches for 10 minutes (staleTime)
 * - These rarely change so aggressive caching is appropriate
 */
export function useWorkstreams() {
  return useQuery({
    queryKey: ['workstreams-phases'],
    queryFn: fetchWorkstreamsAndPhases,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false,
  });
}

export default useWorkstreams;
