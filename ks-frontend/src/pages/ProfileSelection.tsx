import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProfile, LawyerProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/hooks/useAuth';
import { getProfileImage } from '@/utils/profileImages';
import { User, GraduationCap, Briefcase } from 'lucide-react';

function ProfileSelection() {
  const navigate = useNavigate();
  const { availableProfiles, setSelectedProfile } = useProfile();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleProfileSelect = (profile: LawyerProfile) => {
    setSelectedId(profile.id);
    setSelectedProfile(profile);
    
    // Navigate to dashboard after profile selection
    setTimeout(() => {
      navigate('/dashboard');
    }, 500);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Partner':
        return <Briefcase className="w-5 h-5" />;
      case 'Senior Associate':
        return <GraduationCap className="w-5 h-5" />;
      case 'Junior Associate':
        return <User className="w-5 h-5" />;
      case 'Paralegal':
        return <User className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Partner':
        return 'bg-primary text-primary-foreground';
      case 'Senior Associate':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'Junior Associate':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'Paralegal':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Legal Practice Management System
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            Teaching Platform Demo
          </p>
          <p className="text-muted-foreground">
            Choose the fee earner you are acting as. Your own account still records who did the work.
          </p>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg max-w-2xl mx-auto">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Demo Mode:</strong> No authentication required for any profile.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableProfiles.map((profile) => (
              <Card 
                key={profile.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                  selectedId === profile.id 
                    ? 'ring-2 ring-primary shadow-lg scale-105' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => handleProfileSelect(profile)}
              >
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={getProfileImage(profile.name)} alt={profile.name} />
                      <AvatarFallback>
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                          {getRoleIcon(profile.role)}
                        </div>
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    {profile.name}
                  </CardTitle>
                 <Badge className={getRoleColor(profile.role)}>
                   {profile.role}
                 </Badge>
                </CardHeader>
                  <CardContent className="text-center space-y-3">
                    {profile.id !== 'admin' && (
                      <p className="text-sm text-muted-foreground">
                        {profile.email}
                      </p>
                    )}
                   {profile.id !== 'admin' && (
                     <div className="flex justify-center items-center space-x-2">
                        <span className="text-2xl font-bold text-primary">
                          ${profile.chargeRate}
                        </span>
                       <span className="text-sm text-muted-foreground">
                         /hour (Charge Rate)
                       </span>
                     </div>
                   )}
                   {selectedId === profile.id && (
                     <div className="mt-4">
                        <Button className="w-full" size="sm">
                          Entering Dashboard...
                        </Button>
                     </div>
                   )}
                 </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">About This Demo</h3>
              <p className="text-sm text-muted-foreground">
                This teaching platform allows you to experience a legal practice management system 
                from different perspectives. Each profile has different access levels and responsibilities 
                within the system. Switch between profiles to understand how different roles interact 
                with matters, tasks, and client information.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ProfileSelection;