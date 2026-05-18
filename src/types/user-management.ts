export interface UserWithRoles {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  title?: string;
  work_percentage?: number;
  employment_type?: string;
  start_date?: string;
  end_date?: string;
  remarks?: string;
  organization_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  user_roles: UserRole[];
  organizations: Organization;
}

export interface UserRole {
  user_id: string;
  role: string;
  organization_id: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserFormData {
  full_name: string;
  email: string;
  phone: string;
  title: string;
  work_percentage: string;
  employment_type: string;
  start_date: string;
  end_date: string;
  remarks: string;
  organization_id: string;
  active: boolean;
  roles: string[];
}
