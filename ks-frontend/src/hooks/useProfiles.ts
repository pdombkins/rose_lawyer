import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  hourly_rate: number | null;
  cost_rate: number | null;
  avatar_url: string | null;
}

const EXCLUDED_USER_ID = '8bba6096-1be7-4cc9-bccd-98b5da79e41a';
const EXCLUDED_NAME = 'Peter Dombkins';

async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, hourly_rate, cost_rate, avatar_url')
    .order('role', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error);
    throw error;
  }

  // Filter out excluded users
  return (data || []).filter(
    p => p.full_name !== EXCLUDED_NAME && p.id !== EXCLUDED_USER_ID
  );
}

/**
 * Cached profiles hook using TanStack Query
 * - Deduplicates concurrent requests
 * - Caches for 5 minutes (staleTime)
 * - Background refetches after stale
 */
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Get profiles filtered by roles suitable for task assignment
 */
export function useAssignableProfiles() {
  const query = useProfiles();
  
  const assignableProfiles = query.data?.filter(p => 
    p.role && ['partner', 'senior_associate', 'associate', 'junior_associate', 'paralegal', 'staff'].includes(p.role)
  ) || [];

  return {
    ...query,
    data: assignableProfiles,
  };
}

export default useProfiles;
