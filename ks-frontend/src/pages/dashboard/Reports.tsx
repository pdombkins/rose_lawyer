import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, Users, Scale } from "lucide-react";
import { ReportsFinancialPerformance } from "@/components/reports/ReportsFinancialPerformance";
import { ReportsResources } from "@/components/reports/ReportsResources";
import { ReportsLPM } from "@/components/reports/ReportsLPM";

export default function Reports() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-2">
            View financial performance, resource utilization, and legal practice management reports
          </p>
        </div>
      </div>

      {/* Reports Content */}
      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="financial" className="flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Financial Performance
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="lpm" className="flex items-center">
            <Scale className="w-4 h-4 mr-2" />
            LPM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial">
          <ReportsFinancialPerformance />
        </TabsContent>

        <TabsContent value="resources">
          <ReportsResources />
        </TabsContent>

        <TabsContent value="lpm">
          <ReportsLPM />
        </TabsContent>
      </Tabs>
    </div>
  );
}