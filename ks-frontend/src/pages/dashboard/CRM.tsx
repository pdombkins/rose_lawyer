import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Users, 
  DollarSign, 
  FileText, 
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  TrendingUp,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  name: string;
  industry: string;
  headquarters: string;
  actualRevenue: number;
  estimatedRevenue: number;
  activeMatters: number;
  completedMatters: number;
  primaryContact: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
  lastActivity: string;
  status: 'Active' | 'Inactive' | 'Prospective';
}

interface Matter {
  id: string;
  title: string;
  clientId: string;
  status: 'Active' | 'Completed' | 'On Hold';
  estimatedFees: number;
  actualFees: number;
  primaryLawyer: string;
  startDate: string;
  completionDate?: string;
}

export default function CRM() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchClients();
    fetchMatters();
  }, []);

  // Add a refresh function to update data
  const refreshData = () => {
    fetchClients();
    fetchMatters();
  };

  const fetchClients = async () => {
    try {
      const { data } = await supabase
        .from('clients')
        .select(`
          *,
          matters(id, status, total_fees)
        `);

      const clientsWithStats = data?.map(client => {
        const clientMatters = client.matters || [];
        const activeMatters = clientMatters.filter(m => m.status === 'active').length;
        const completedMatters = clientMatters.filter(m => m.status === 'completed').length;
        // Use total_fees as actual revenue, and estimated as the same for now
        const actualRevenue = clientMatters.reduce((sum, m) => sum + (m.total_fees || 0), 0);
        const estimatedRevenue = actualRevenue; // For now, use same value

        return {
          id: client.id,
          name: client.name,
          industry: 'Not Specified', // No industry field in current schema
          headquarters: client.address || 'Unknown',
          actualRevenue,
          estimatedRevenue,
          activeMatters,
          completedMatters,
          primaryContact: {
            name: client.name,
            title: 'Primary Contact',
            email: client.email || '',
            phone: client.phone || ''
          },
          lastActivity: client.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          status: (activeMatters > 0 ? 'Active' : 'Inactive') as 'Active' | 'Inactive' | 'Prospective'
        };
      }) || [];

      setClients(clientsWithStats);
    } catch (error) {
      console.error('Error fetching clients:', error);
      // Fallback to demo data
      setClients([
      {
        id: '1',
        name: 'NexaCare Health',
        industry: 'Healthcare & Life Sciences',
        headquarters: 'Melbourne, Australia',
        actualRevenue: 2850000,
        estimatedRevenue: 2850000,
        activeMatters: 1,
        completedMatters: 0,
        primaryContact: {
          name: 'Dr. Alexandra Keller',
          title: 'Chief Executive Officer',
          email: 'alexandra.keller@nexacare.com.au',
          phone: '+61 3 9555 1234'
        },
        lastActivity: '2024-11-15',
        status: 'Active'
      },
      {
        id: '2',
        name: 'Meridian Capital Partners',
        industry: 'Financial Services',
        headquarters: 'Sydney, Australia',
        actualRevenue: 4200000,
        estimatedRevenue: 4200000,
        activeMatters: 1,
        completedMatters: 2,
        primaryContact: {
          name: 'James Richardson',
          title: 'Managing Partner',
          email: 'james.richardson@meridiancap.com.au',
          phone: '+61 2 9888 5678'
        },
        lastActivity: '2024-11-12',
        status: 'Active'
      },
      {
        id: '3',
        name: 'Australian Mining Consortium',
        industry: 'Resources & Mining',
        headquarters: 'Perth, Australia',
        actualRevenue: 6100000,
        estimatedRevenue: 6100000,
        activeMatters: 0,
        completedMatters: 1,
        primaryContact: {
          name: 'Sarah Chen',
          title: 'Chief Legal Officer',
          email: 'sarah.chen@amc.com.au',
          phone: '+61 8 9777 9012'
        },
        lastActivity: '2024-09-28',
        status: 'Inactive'
      },
      {
        id: '4',
        name: 'TechFlow Solutions',
        industry: 'Technology & Media',
        headquarters: 'Sydney, Australia',
        actualRevenue: 1900000,
        estimatedRevenue: 1900000,
        activeMatters: 0,
        completedMatters: 1,
        primaryContact: {
          name: 'Michael Zhang',
          title: 'General Counsel',
          email: 'michael.zhang@techflow.com.au',
          phone: '+61 2 9666 3456'
        },
        lastActivity: '2024-08-15',
        status: 'Inactive'
      },
      {
        id: '5',
        name: 'Pacific Energy Group',
        industry: 'Energy & Utilities',
        headquarters: 'Brisbane, Australia',
        actualRevenue: 3400000,
        estimatedRevenue: 3400000,
        activeMatters: 0,
        completedMatters: 1,
        primaryContact: {
          name: 'Lisa Patel',
          title: 'Chief Executive Officer',
          email: 'lisa.patel@pacificenergy.com.au',
          phone: '+61 7 9555 7890'
        },
        lastActivity: '2024-07-22',
        status: 'Inactive'
      },
      {
        id: '6',
        name: 'Metro Healthcare Network',
        industry: 'Healthcare & Life Sciences',
        headquarters: 'Melbourne, Australia',
        actualRevenue: 1200000,
        estimatedRevenue: 1200000,
        activeMatters: 0,
        completedMatters: 1,
        primaryContact: {
          name: 'David Kumar',
          title: 'Chief Operating Officer',
          email: 'david.kumar@metrohealth.com.au',
          phone: '+61 3 9444 2345'
        },
        lastActivity: '2024-06-10',
        status: 'Inactive'
      },
      {
        id: '7',
        name: 'Coastal Development Corp',
        industry: 'Real Estate & Construction',
        headquarters: 'Gold Coast, Australia',
        actualRevenue: 0,
        estimatedRevenue: 0,
        activeMatters: 0,
        completedMatters: 0,
        primaryContact: {
          name: 'Amanda Foster',
          title: 'Legal Director',
          email: 'amanda.foster@coastal.com.au',
          phone: '+61 7 9333 1234'
        },
        lastActivity: '2024-11-10',
        status: 'Prospective'
      }]);
    }
  };

  const fetchMatters = async () => {
    try {
      const { data } = await supabase
        .from('matters')
        .select(`
          *,
          profiles!matters_lead_partner_id_fkey(full_name)
        `);

      const mattersWithDetails = data?.map(matter => {        
        return {
          id: matter.id,
          title: matter.title,
          clientId: matter.client_id,
          status: matter.status?.charAt(0).toUpperCase() + matter.status?.slice(1) as 'Active' | 'Completed' | 'On Hold',
          estimatedFees: matter.total_fees || 0, // Using total_fees as estimated for now
          actualFees: matter.total_fees || 0,
          primaryLawyer: matter.profiles?.full_name || 'Unassigned',
          startDate: matter.start_date || matter.created_at?.split('T')[0] || '',
          completionDate: matter.end_date
        };
      }) || [];

      setMatters(mattersWithDetails);
    } catch (error) {
      console.error('Error fetching matters:', error);
      // Fallback to demo data
      setMatters([
      {
        id: '1',
        title: 'Whitegum Medical Centres Acquisition',
        clientId: '1',
        status: 'Active',
        estimatedFees: 2850000,
        actualFees: 580000,
        primaryLawyer: 'James Bentley',
        startDate: '2024-10-01'
      },
      {
        id: '2',
        title: 'European Expansion Transaction',
        clientId: '2',
        status: 'Active',
        estimatedFees: 1200000,
        actualFees: 340000,
        primaryLawyer: 'Priya Iyer',
        startDate: '2024-09-15'
      },
      {
        id: '3',
        title: 'Mining Assets Acquisition',
        clientId: '3',
        status: 'Completed',
        estimatedFees: 6100000,
        actualFees: 6100000,
        primaryLawyer: 'James Bentley',
        startDate: '2024-01-15',
        completionDate: '2024-09-15'
      },
      {
        id: '4',
        title: 'Software IP Portfolio Sale',
        clientId: '4',
        status: 'Completed',
        estimatedFees: 1900000,
        actualFees: 1900000,
        primaryLawyer: 'David O\'Connell',
        startDate: '2024-03-01',
        completionDate: '2024-08-01'
      },
      {
        id: '5',
        title: 'Renewable Energy Joint Venture',
        clientId: '5',
        status: 'Completed',
        estimatedFees: 3400000,
        actualFees: 3400000,
        primaryLawyer: 'Priya Iyer',
        startDate: '2024-01-20',
        completionDate: '2024-07-15'
      },
      {
        id: '6',
        title: 'Healthcare Network Consolidation',
        clientId: '6',
        status: 'Completed',
        estimatedFees: 1200000,
        actualFees: 1200000,
        primaryLawyer: 'Lily Chen',
        startDate: '2024-02-10',
        completionDate: '2024-06-05'
      }]);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.primaryContact.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || !filterStatus || client.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getClientMatters = (clientId: string) => {
    return matters.filter(matter => matter.clientId === clientId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Inactive':
        return 'bg-gray-500';
      case 'Prospective':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTotalRevenue = () => {
    return clients.reduce((sum, client) => sum + client.actualRevenue, 0);
  };

  const getActiveClients = () => {
    return clients.filter(client => client.status === 'Active').length;
  };

  const getProspectiveClients = () => {
    return clients.filter(client => client.status === 'Prospective').length;
  };

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
                  Client Relationship Management
                </h1>
                <p className="text-sm text-muted-foreground">Manage client relationships and track matters</p>
              </div>
            </div>
            
            <Button className="elegant-button" onClick={() => navigate('/client-intake')}>
              <Plus className="w-4 h-4 mr-2" />
              New Client
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-burgundy/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary-burgundy" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{clients.length}</div>
                  <div className="text-sm text-muted-foreground">Total Clients</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{getActiveClients()}</div>
                  <div className="text-sm text-muted-foreground">Active Clients</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{getProspectiveClients()}</div>
                  <div className="text-sm text-muted-foreground">Prospects</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    ${(getTotalRevenue() / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="premium-card mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search clients or contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Prospective">Prospective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredClients.map(client => {
            const clientMatters = getClientMatters(client.id);
            return (
              <Card key={client.id} className="premium-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="font-serif text-xl text-foreground flex items-center space-x-3">
                        <span>{client.name}</span>
                        <Badge className={getStatusColor(client.status) + ' text-white text-xs'}>
                          {client.status}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{client.industry}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                   {/* Client Summary */}
                   <div className="grid grid-cols-2 gap-4 p-4 bg-accent/20 rounded-lg">
                     <div className="text-center">
                       <div className="text-lg font-bold text-foreground">
                         ${(client.actualRevenue / 1000).toFixed(0)}K
                       </div>
                       <div className="text-xs text-muted-foreground">Actual Revenue</div>
                     </div>
                     <div className="text-center">
                       <div className="text-lg font-bold text-foreground">
                         ${(client.estimatedRevenue / 1000).toFixed(0)}K
                       </div>
                       <div className="text-xs text-muted-foreground">Total Estimated Revenue</div>
                     </div>
                     <div className="text-center">
                       <div className="text-lg font-bold text-foreground">{client.activeMatters}</div>
                       <div className="text-xs text-muted-foreground">Active</div>
                     </div>
                     <div className="text-center">
                       <div className="text-lg font-bold text-foreground">{client.completedMatters}</div>
                       <div className="text-xs text-muted-foreground">Completed</div>
                     </div>
                   </div>

                  {/* Primary Contact */}
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Primary Contact
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="font-medium text-foreground">{client.primaryContact.name}</div>
                      <div className="text-muted-foreground">{client.primaryContact.title}</div>
                      <div className="flex items-center space-x-4 text-muted-foreground">
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {client.primaryContact.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {client.primaryContact.phone}
                        </div>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-3 h-3 mr-1" />
                        {client.headquarters}
                      </div>
                    </div>
                  </div>

                  {/* Recent Matters */}
                  {clientMatters.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Recent Matters
                      </h4>
                      <div className="space-y-2">
                        {clientMatters.slice(0, 2).map(matter => (
                          <div key={matter.id} className="p-3 border border-border rounded-lg hover:bg-accent/20 cursor-pointer transition-colors" onClick={() => navigate(`/dashboard/matter/${matter.id}`)}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-foreground text-sm">{matter.title}</div>
                              <Badge className={`${
                                matter.status === 'Active' ? 'bg-green-500' :
                                matter.status === 'Completed' ? 'bg-blue-500' : 'bg-yellow-500'
                              } text-white text-xs`}>
                                {matter.status}
                              </Badge>
                            </div>
                             <div className="flex items-center justify-between text-xs text-muted-foreground">
                               <span>Lead Partner: {matter.primaryLawyer}</span>
                               <span>${(matter.actualFees / 1000).toFixed(0)}K / ${(matter.estimatedFees / 1000).toFixed(0)}K</span>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                   )}

                   {/* Last Activity */}
                   <div className="pt-4 border-t border-border">
                     <div className="text-xs text-muted-foreground">
                       Last activity: {new Date(client.lastActivity).toLocaleDateString()}
                     </div>
                   </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-2xl font-bold text-foreground mb-2">No Clients Found</h3>
            <p className="text-muted-foreground mb-6">
              No clients match your current search and filter criteria.
            </p>
            <Button 
              onClick={() => {
                setSearchTerm("");
                setFilterStatus("all");
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}