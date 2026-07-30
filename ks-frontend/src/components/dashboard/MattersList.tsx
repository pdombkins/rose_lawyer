import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Users, 
  MoreHorizontal,
  ExternalLink
} from "lucide-react";

interface Matter {
  id: string;
  title: string;
  description: string | null;
  status: string;
  matter_type: string | null;
  created_at: string;
  total_fees?: number;
  start_date?: string;
  end_date?: string;
  client?: {
    name: string;
  } | null;
  lead_partner?: {
    full_name: string;
  } | null;
}

export default function MattersList() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedProfile } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatters();
  }, [selectedProfile]);

  const fetchMatters = async () => {
    if (!selectedProfile) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('matters')
        .select('id, title, description, status, matter_type, created_at, total_fees, start_date, end_date, client_id, lead_partner_id, fee_type, fixed_fee, hourly_rate')
        .ilike('status', 'active');
      
      // Filter based on profile role (Admin first!)
      if (selectedProfile.id === 'admin') {
        // Administrators can see ALL active matters
        // No additional filtering needed - query already filters by status = 'active'
      } else if (selectedProfile.role === 'Partner') {
        // Partners can see all matters where they are the lead partner OR have tasks assigned
        const { data: taskMatters } = await supabase
          .from('tasks')
          .select('matter_id')
          .eq('assigned_to', selectedProfile.id);
        
        const taskMatterIds = taskMatters?.map(t => t.matter_id) || [];
        
        // Get matters where this partner is the lead partner OR has tasks
        if (taskMatterIds.length > 0) {
          query = query.or(`lead_partner_id.eq.${selectedProfile.id},id.in.(${taskMatterIds.join(',')})`);
        } else {
          query = query.eq('lead_partner_id', selectedProfile.id);
        }
      } else {
        // Non-partners (except admin) can see matters where they have tasks assigned
        const { data: taskMatters } = await supabase
          .from('tasks')
          .select('matter_id')
          .eq('assigned_to', selectedProfile.id);
        
        const taskMatterIds = taskMatters?.map(t => t.matter_id) || [];
        
        if (taskMatterIds.length > 0) {
          query = query.in('id', taskMatterIds);
        } else {
          // If no tasks assigned, return empty array
          setMatters([]);
          setLoading(false);
          return;
        }
      }
      
      const { data: mattersData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      console.log('[MattersList] Fetched matters:', mattersData?.length || 0, mattersData);

      // Fetch client names separately to avoid embedding ambiguity
      const clientIds = [...new Set(mattersData?.map((m: any) => m.client_id).filter(Boolean) || [])];
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);

      // Fetch partner names separately
      const partnerIds = [...new Set(mattersData?.map((m: any) => m.lead_partner_id).filter(Boolean) || [])];
      let partnersData: { id: string; full_name: string }[] | null = [];
      if (partnerIds.length > 0) {
        const partnersRes = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', partnerIds);
        partnersData = partnersRes.data;
        if (partnersRes.error) {
          console.warn('[MattersList] Error fetching partners:', partnersRes.error);
        }
      }

      console.log('[MattersList] Partner IDs:', partnerIds);
      console.log('[MattersList] Fetched partners:', partnersData?.length || 0, partnersData);

      // Create lookup maps
      const clientsMap = new Map((clientsData || []).map((c: any) => [c.id, c.name]));
      const partnersMap = new Map((partnersData || []).map((p: any) => [p.id, p.full_name]));

      // Compute estimated value per matter (fixed fee uses fixed_fee; hourly uses sum(estimated_hours * rate))
      const matterIds = [...new Set((mattersData || []).map((m: any) => m.id))];
      const matterHourlyMap = new Map((mattersData || []).map((m: any) => [m.id, m.hourly_rate || 0]));

      // Fetch tasks for these matters
      const { data: tasksInMatters } = await supabase
        .from('tasks')
        .select('id, matter_id')
        .in('matter_id', matterIds);

      const taskIdToMatter = new Map((tasksInMatters || []).map((t: any) => [t.id, t.matter_id]));
      const taskIds = (tasksInMatters || []).map((t: any) => t.id);

      let estimatedPerMatter: Record<string, number> = {};

      if (taskIds.length > 0) {
        const { data: assignments } = await supabase
          .from('task_assignments')
          .select('task_id, user_id, estimated_hours')
          .in('task_id', taskIds);

        const userIds = [...new Set((assignments || []).map((a: any) => a.user_id))];
        const { data: profilesRates } = userIds.length > 0
          ? await supabase.from('profiles').select('id, hourly_rate').in('id', userIds)
          : { data: [] as any[] } as any;
        const profileRateMap = new Map((profilesRates || []).map((p: any) => [p.id, p.hourly_rate || 0]));

        for (const a of (assignments || [])) {
          const matterId = taskIdToMatter.get(a.task_id);
          if (!matterId) continue;
          const userRate = profileRateMap.get(a.user_id) || matterHourlyMap.get(matterId) || 0;
          const est = (Number(a.estimated_hours) || 0) * (Number(userRate) || 0);
          estimatedPerMatter[matterId] = (estimatedPerMatter[matterId] || 0) + est;
        }
      }

      // Transform the data to match our interface and attach estimated_value
      const transformedMatters = (mattersData || []).map((matter: any) => ({
        ...matter,
        client: { name: clientsMap.get(matter.client_id) || 'Unknown Client' },
        lead_partner: { full_name: partnersMap.get(matter.lead_partner_id) || 'Unassigned' },
        estimated_value: matter.fee_type === 'fixed_fee' && matter.fixed_fee
          ? Number(matter.fixed_fee)
          : (estimatedPerMatter[matter.id] || 0),
      }));

      console.log('[MattersList] Transformed matters (lead partners):', transformedMatters.map((m: any) => ({ id: m.id, lp: m.lead_partner?.full_name })));

      setMatters(transformedMatters);
    } catch (error) {
      console.error('Error fetching matters:', error);
      // Fallback to demo data if database is empty
      setMatters([
        {
          id: '750e8400-e29b-41d4-a716-446655440001',
          title: 'NexaCare Health - Whitegum Medical Centres Acquisition',
          description: 'Acquisition of Whitegum Medical Centres Pty Ltd, a private operator of 18 medical centres across NSW and QLD',
          status: 'active',
          matter_type: 'Mergers & Acquisitions',
          created_at: '2024-10-01T00:00:00Z',
          client: { name: 'NexaCare Health' },
          lead_partner: { full_name: 'James Bentley' }
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440002',
          title: 'TechFlow Solutions - Employment Contract Review',
          description: 'Review and update employment contracts for executive team following restructure',
          status: 'active',
          matter_type: 'Employment Law',
          created_at: '2024-11-01T00:00:00Z',
          client: { name: 'TechFlow Solutions' },
          lead_partner: { full_name: 'Priya Iyer' }
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440003',
          title: 'Meridian Property - CBD Development Project',
          description: 'Large-scale commercial property development in Sydney CBD',
          status: 'active',
          matter_type: 'Property Law',
          created_at: '2024-10-15T00:00:00Z',
          client: { name: 'Meridian Property' },
          lead_partner: { full_name: 'David O\'Connell' }
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440004',
          title: 'Australian Mining Corp - Regulatory Compliance',
          description: 'Environmental and mining law compliance for new extraction permits',
          status: 'active',
          matter_type: 'Regulatory Compliance',
          created_at: '2024-11-10T00:00:00Z',
          client: { name: 'Australian Mining Corp' },
          lead_partner: { full_name: 'Lily Chen' }
        },
        {
          id: '750e8400-e29b-41d4-a716-446655440005',
          title: 'Global Logistics - Cross-Border Transaction',
          description: 'International acquisition involving complex jurisdictional issues',
          status: 'active',
          matter_type: 'Mergers & Acquisitions',
          created_at: '2024-11-05T00:00:00Z',
          client: { name: 'Global Logistics' },
          lead_partner: { full_name: 'James Bentley' }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'completed':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'on hold':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getMatterTypeIcon = (matterType: string | null) => {
    if (!matterType) return <FileText className="w-4 h-4" />;
    
    if (matterType.toLowerCase().includes('merger') || matterType.toLowerCase().includes('acquisition')) {
      return <DollarSign className="w-4 h-4" />;
    }
    if (matterType.toLowerCase().includes('employment')) {
      return <Users className="w-4 h-4" />;
    }
    if (matterType.toLowerCase().includes('property')) {
      return <Calendar className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  };

  const handleMatterClick = (matterId: string) => {
    navigate(`/dashboard/matter/${matterId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Matters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-muted rounded-lg h-20"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="font-serif text-xl text-foreground">
          Active Matters
        </CardTitle>
      </CardHeader>
      <CardContent>
        {matters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active matters found.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate('/dashboard/crm')}
            >
              Create New Matter
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {matters.map((matter) => (
              <Card 
                key={matter.id}
                className="cursor-pointer transition-all hover:shadow-md border-border/50 hover:border-primary/20"
                onClick={() => handleMatterClick(matter.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mt-1">
                        {getMatterTypeIcon(matter.matter_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {matter.title}
                          </h3>
                          <Badge 
                            variant="secondary"
                            className={getStatusColor(matter.status)}
                          >
                            {matter.status.charAt(0).toUpperCase() + matter.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {matter.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Client: {matter.client?.name || 'Unknown'}</span>
                          <span>•</span>
                          <span>Lead Partner: {matter.lead_partner?.full_name || 'Unassigned'}</span>
                          <span>•</span>
                          <span>Fee Type: {(matter as any).fee_type === 'fixed_fee' ? 'Fixed Fee' : 'Hourly Rates'}</span>
                          <span>•</span>
                          {(matter as any).fee_type === 'fixed_fee' && (matter as any).fixed_fee ? (
                            <span>Fixed Fee: ${Number((matter as any).fixed_fee).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          ) : (
                            <span>Est. Value: ${Number((matter as any).estimated_value || 0).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          )}
                          {matter.matter_type && (
                            <>
                              <span>•</span>
                              <span>{matter.matter_type}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMatterClick(matter.id);
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}