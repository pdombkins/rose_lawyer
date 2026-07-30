import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LawyerProfile {
  id: string;
  name: string;
  email: string;
  role: 'Partner' | 'Senior Associate' | 'Junior Associate' | 'Legal Assistant';
  chargeRate: number;
  costRate?: number;
  avatar?: string;
  requiresAuth?: boolean;
}

interface ProfileContextType {
  selectedProfile: LawyerProfile | null;
  setSelectedProfile: (profile: LawyerProfile | null) => void;
  availableProfiles: LawyerProfile[];
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// Fallback hardcoded profiles for demo purposes (synchronized with database rates)
const fallbackProfiles: LawyerProfile[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'James Bentley',
    email: 'j.bentley@kendryslate.com',
    role: 'Partner',
    chargeRate: 850,
    costRate: 552.50
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Priya Iyer',
    email: 'p.iyer@kendryslate.com',
    role: 'Partner',
    chargeRate: 650,
    costRate: 422.50
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'David O\'Connell',
    email: 'd.oconnell@kendryslate.com',
    role: 'Senior Associate',
    chargeRate: 600,
    costRate: 390.00
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Lily Chen',
    email: 'l.chen@kendryslate.com',
    role: 'Senior Associate',
    chargeRate: 600,
    costRate: 390.00
  },
  {
    id: '72fad04a-fc8d-47ee-bd7c-af0307a9e596',
    name: 'Aisha Rahman',
    email: 'a.rahman@kendryslate.com',
    role: 'Junior Associate',
    chargeRate: 300,
    costRate: 195.00
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Tom Nguyen',
    email: 't.nguyen@kendryslate.com',
    role: 'Junior Associate',
    chargeRate: 300,
    costRate: 195.00
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'Mia Rossi',
    email: 'm.rossi@kendryslate.com',
    role: 'Legal Assistant',
    chargeRate: 200,
    costRate: 130.00
  }
];

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedProfile, setSelectedProfile] = useState<LawyerProfile | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<LawyerProfile[]>(fallbackProfiles);

  const refreshProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, hourly_rate, cost_rate')
        .neq('role', 'inactive')
        .order('full_name');

      if (error) {
        console.error('Error fetching profiles:', error);
        // Use fallback profiles if there's an error
        setAvailableProfiles(fallbackProfiles);
        return;
      }

      const fetchedProfiles: LawyerProfile[] = (data || [])
        .filter(profile => profile.full_name !== 'Peter Dombkins') // Hide Peter Dombkins profile
        .map(profile => {
          // Map database role to UI role
          let mappedRole: 'Partner' | 'Senior Associate' | 'Junior Associate' | 'Legal Assistant' = 'Legal Assistant';
          const roleStr = (profile.role || '').toString().toLowerCase().trim();
          
          if (roleStr === 'partner') mappedRole = 'Partner';
          else if (roleStr === 'senior_associate') mappedRole = 'Senior Associate';
          else if (roleStr === 'junior_associate' || roleStr === 'associate') mappedRole = 'Junior Associate';
          else if (roleStr === 'paralegal' || roleStr === 'legal_assistant') mappedRole = 'Legal Assistant';
          
          return {
            id: profile.id,
            name: profile.full_name || 'Unknown User',
            email: profile.email || '',
            role: mappedRole,
            chargeRate: profile.hourly_rate || 0,
            costRate: profile.cost_rate || 0
          };
        });

      // The synthetic 'admin' persona has been removed. It was not a real
      // fee earner and existed only to unlock the demo-mode admin screens;
      // instructor access is now Rose's user_profiles.is_admin, checked by
      // ProtectedRoute. Personas are fee earners only.
      setAvailableProfiles(fetchedProfiles);
    } catch (error) {
      console.error('Error in refreshProfiles:', error);
      setAvailableProfiles(fallbackProfiles);
    }
  };

  // Load profiles from Supabase on mount
  useEffect(() => {
    refreshProfiles();
  }, []);

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('selectedProfile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        setSelectedProfile(profile);
      } catch (error) {
        console.error('Failed to parse saved profile:', error);
        localStorage.removeItem('selectedProfile');
      }
    }
  }, []);

  // Save profile to localStorage when it changes
  useEffect(() => {
    if (selectedProfile) {
      localStorage.setItem('selectedProfile', JSON.stringify(selectedProfile));
    } else {
      localStorage.removeItem('selectedProfile');
    }
  }, [selectedProfile]);

  const value = {
    selectedProfile,
    setSelectedProfile,
    availableProfiles,
    refreshProfiles
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};