import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FinancialPerformanceTab } from "@/components/admin/FinancialPerformanceTab";
import { ResourcesTab } from "@/components/admin/ResourcesTab";
import { SystemPerformanceTab } from "@/components/admin/SystemPerformanceTab";
import { LPMTab } from "@/components/admin/LPMTab";
import { 
  ArrowLeft, 
  Settings, 
  DollarSign, 
  Users, 
  Activity,
  Shield,
  BarChart3
} from "lucide-react";

export default function AdminControls() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if current user has admin access via selected profile
    const stored = localStorage.getItem('selectedProfile');
    const current = stored ? JSON.parse(stored) : null;
    if (!current || current.role !== 'Partner') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access administrative controls.",
        variant: "destructive"
      });
      navigate('/dashboard');
      return;
    }
  }, [navigate, toast]);

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
                <h1 className="font-serif text-2xl font-bold text-foreground flex items-center">
                  <Settings className="w-6 h-6 mr-3 text-primary-burgundy" />
                  Administrative Controls
                </h1>
                <p className="text-sm text-muted-foreground">Manage system settings, resources, and performance</p>
              </div>
            </div>
            
            <Badge className="bg-primary-burgundy text-primary-foreground">
              <Shield className="w-4 h-4 mr-2" />
              Admin Access
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="financial" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="financial" className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              Financial Performance
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="lpm" className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              LPM
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              System Performance
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="financial" className="mt-6">
            <FinancialPerformanceTab />
          </TabsContent>
          
          <TabsContent value="resources" className="mt-6">
            <ResourcesTab />
          </TabsContent>
          
          <TabsContent value="lpm" className="mt-6">
            <LPMTab />
          </TabsContent>
          
          <TabsContent value="system" className="mt-6">
            <SystemPerformanceTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}