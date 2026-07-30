export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Partner' | 'Senior Associate' | 'Junior Associate' | 'Legal Assistant';
  hourly_rate: number;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  description?: string;
  headquarters_location?: string;
  total_fees: number;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  title: string;
  email: string;
  phone?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Matter {
  id: string;
  title: string;
  client_id: string;
  description?: string;
  status: 'Active' | 'Completed' | 'On Hold' | 'Cancelled';
  start_date: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  estimated_total_fees: number;
  actual_total_fees: number;
  primary_partner_id: string;
  created_at: string;
  updated_at: string;
}

export interface MatterParticipant {
  id: string;
  matter_id: string;
  user_id: string;
  role: 'Lead Partner' | 'Partner' | 'Senior Associate' | 'Junior Associate' | 'Legal Assistant';
  created_at: string;
}

export interface Task {
  id: string;
  matter_id: string;
  title: string;
  description?: string;
  assigned_to: string;
  workstream: 'Corporate' | 'Commercial' | 'Employment' | 'Data' | 'Real Estate';
  phase: string;
  status: 'Open' | 'In Progress' | 'Completed' | 'Paused' | 'Late' | 'Cancelled';
  due_date?: string;
  completed_date?: string;
  estimated_hours: number;
  actual_hours: number;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  matter_id: string;
  task_id: string;
  user_id: string;
  hours: number;
  description?: string;
  rate: number;
  total_fee: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  matter_id: string;
  title: string;
  description?: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Office {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  is_headquarters: boolean;
  created_at: string;
}