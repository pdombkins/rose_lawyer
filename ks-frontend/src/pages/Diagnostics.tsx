import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  duration?: number;
}

export default function Diagnostics() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const iso = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();
  const dt = new Date(iso);
  const aest = dt.toLocaleString('en-AU', {
    timeZone: 'Australia/Brisbane',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const updateTestResult = (name: string, result: Partial<TestResult>) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        return prev.map(r => r.name === name ? { ...r, ...result } : r);
      }
      return [...prev, { name, status: 'pending', message: '', ...result }];
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      { name: 'Supabase Client Config', test: testSupabaseConfig },
      { name: 'Database Connection', test: testDatabaseConnection },
      { name: 'CORS Preflight', test: testCORSPreflight },
      { name: 'Sample Database Query', test: testSampleQuery }
    ];

    for (const { name, test } of tests) {
      updateTestResult(name, { status: 'pending', message: 'Running...' });
      try {
        const startTime = Date.now();
        await test();
        const duration = Date.now() - startTime;
        updateTestResult(name, { 
          status: 'success', 
          message: `Completed successfully`,
          duration 
        });
      } catch (error: any) {
        updateTestResult(name, { 
          status: 'error', 
          message: error.message || 'Unknown error',
          details: error.details || error
        });
      }
    }

    setIsRunning(false);
  };

  const testSupabaseConfig = async () => {
    const url = import.meta.env.VITE_SUPABASE_URL ?? "https://vmdswdlkaxlklgvsvuqi.supabase.co";
    const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqampsYXdnZW1tcWF4Z2F3YW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODM5NzYsImV4cCI6MjA3MjA1OTk3Nn0.r9qZkTeKEHNzyCgB_Tv5NrtR_ocIlxxoBrvZx9u1tto";
    
    if (!url || !key) {
      throw new Error('Supabase URL or Key not configured');
    }
    
    if (!url.includes('supabase.co')) {
      throw new Error('Invalid Supabase URL format');
    }
    
    if (key.length < 100) {
      throw new Error('Supabase key appears to be invalid (too short)');
    }
  };

  const testDatabaseConnection = async () => {
    const { data, error } = await supabase.from('matters').select('count').limit(1);
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  };

  const testEdgeFunction = async (functionName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'ping' }
      });
      
      if (error) {
        throw new Error(`Function invocation failed: ${error.message}`);
      }
      
      if (!data || data.status !== 'ok') {
        throw new Error(`Function responded but ping failed: ${JSON.stringify(data)}`);
      }
      
      updateTestResult(`${functionName} Function`, {
        details: data
      });
    } catch (error: any) {
      throw new Error(`${functionName} function test failed: ${error.message}`);
    }
  };

  const testCORSPreflight = async () => {
    try {
      const response = await fetch(`https://vmdswdlkaxlklgvsvuqi.supabase.co/functions/v1/reset-processor`, {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type'
        }
      });
      
      if (!response.ok) {
        throw new Error(`CORS preflight failed with status ${response.status}`);
      }
      
      const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
      if (!corsOrigin || corsOrigin === 'null') {
        throw new Error('CORS Access-Control-Allow-Origin header missing or null');
      }
    } catch (error: any) {
      throw new Error(`CORS preflight test failed: ${error.message}`);
    }
  };

  const testSampleQuery = async () => {
    const { data, error } = await supabase
      .from('matters')
      .select('id, title')
      .limit(3);
      
    if (error) {
      throw new Error(`Sample query failed: ${error.message}`);
    }
    
    updateTestResult('Sample Database Query', {
      details: { recordCount: data?.length || 0, sample: data }
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary',
      pending: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h1 className="font-serif text-3xl font-bold mb-6">Deployment Diagnostics</h1>
            
            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Build Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 font-mono text-sm">
                  <div><span className="text-muted-foreground">Build Time (AEST):</span> {aest}</div>
                  <div><span className="text-muted-foreground">Build ISO:</span> {iso}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Client Environment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 font-mono text-sm break-words">
                  <div><span className="text-muted-foreground">Location:</span> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</div>
                  <div><span className="text-muted-foreground">User Agent:</span> {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  System Diagnostics
                  <Button 
                    onClick={runDiagnostics} 
                    disabled={isRunning}
                    variant="outline"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running Tests
                      </>
                    ) : (
                      'Run Diagnostics'
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResults.length === 0 ? (
                  <p className="text-muted-foreground">Click "Run Diagnostics" to test system connectivity and configuration.</p>
                ) : (
                  <div className="space-y-4">
                    {testResults.map((result) => (
                      <div key={result.name} className="flex items-start justify-between p-3 border rounded-lg">
                        <div className="flex items-start space-x-3 flex-1">
                          {getStatusIcon(result.status)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{result.name}</span>
                              {getStatusBadge(result.status)}
                              {result.duration && (
                                <span className="text-xs text-muted-foreground">
                                  ({result.duration}ms)
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                            {result.details && (
                              <details className="mt-2">
                                <summary className="text-xs cursor-pointer text-muted-foreground">
                                  Show details
                                </summary>
                                <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
                                  {JSON.stringify(result.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Testing Commands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Test time-entries function:</h4>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
{`curl -X POST "https://vmdswdlkaxlklgvsvuqi.supabase.co/functions/v1/reset-processor" \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqampsYXdnZW1tcWF4Z2F3YW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODM5NzYsImV4cCI6MjA3MjA1OTk3Nn0.r9qZkTeKEHNzyCgB_Tv5NrtR_ocIlxxoBrvZx9u1tto" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"ping"}'`}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Test an edge function (instructor only):</h4>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
{`curl -X POST "https://vmdswdlkaxlklgvsvuqi.supabase.co/functions/v1/reset-processor" \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqampsYXdnZW1tcWF4Z2F3YW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0ODM5NzYsImV4cCI6MjA3MjA1OTk3Nn0.r9qZkTeKEHNzyCgB_Tv5NrtR_ocIlxxoBrvZx9u1tto" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"ping"}'`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="mt-6 text-sm text-muted-foreground">
              Tip: If this page does not show the same build time as the editor preview, the published domain may be pointing to a different project or a cached deployment.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}