import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/NotificationBell';
import { useProfile } from '@/contexts/ProfileContext';
import { getProfileImage } from '@/utils/profileImages';
import { User, LogOut, Home } from 'lucide-react';

export function ProfileHeader() {
  const { selectedProfile, setSelectedProfile } = useProfile();
  const navigate = useNavigate();

  if (!selectedProfile) return null;

  const handleLogout = () => {
    setSelectedProfile(null);
    navigate('/profile-selection');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Partner':
        return 'bg-primary text-primary-foreground';
      case 'Senior Associate':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'Junior Associate':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="w-12 h-12">
              <AvatarImage 
                src={getProfileImage(selectedProfile.name)} 
                alt={selectedProfile.name}
              />
              <AvatarFallback>
                <User className="w-6 h-6 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedProfile.name}
                </h2>
                <Badge className={getRoleColor(selectedProfile.role)}>
                  {selectedProfile.role}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedProfile.id !== 'admin' && selectedProfile.email}
                {selectedProfile.id !== 'admin' && ` • $${selectedProfile.chargeRate}/hour`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <Link to="/">
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Public Site
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Switch Profile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}