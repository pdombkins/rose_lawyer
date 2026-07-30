import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Restrict to instructors (Rose user_profiles.is_admin). */
  requireAdmin?: boolean;
}

/**
 * Route guard.
 *
 * The previous implementation returned `children` unconditionally with the
 * comment "No authentication required for demo mode" — every dashboard,
 * every client's data, every billing figure was reachable by anyone with the
 * URL. That is what this replaces.
 *
 * Unauthenticated users are sent to Rose's login rather than a local one:
 * there is a single account per student across both apps, and after signing
 * in they come straight back here.
 */
export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="flex items-center space-x-4 p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p>Loading…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-lg font-semibold">Sign in required</h1>
            <p className="text-sm text-muted-foreground">
              The Kendry &amp; Slate practice management system uses your Rose
              account. Sign in once and you&rsquo;ll have access to both.
            </p>
            <Button asChild className="w-full">
              <a href={`/login?returnTo=${returnTo}`}>Sign in</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md">
          <CardContent className="p-6 space-y-3">
            <h1 className="text-lg font-semibold">Instructor access only</h1>
            <p className="text-sm text-muted-foreground">
              This area is restricted to the course convenor.
            </p>
            <Button asChild variant="outline" className="w-full">
              <a href="/firm/dashboard">Back to the dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
