export type Organization = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Role = 
  | 'admin'
  | 'leder'
  | 'nesteder'
  | 'kommunikasjonsrådgiver'
  | 'regnskap'
  | 'employee'
  | 'subject_area_leader';

export type User = {
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
};

export type UserRole = {
  user_id: string;
  role: Role;
  organization_id: string;
  created_at: string;
};

export type SubjectArea = {
  id: string;
  name: string;
  annual_objective?: string;
  action_plan?: string;
  leader_id?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
};

export type UserSubjectArea = {
  user_id: string;
  subject_area_id: string;
  created_at: string;
};

export type ActivityType = 
  | 'participated_event'
  | 'arranged_event'
  | 'publication';

export type FundingType = 
  | 'internal'
  | 'external'
  | 'grant'
  | 'collaboration';

export type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  link?: string;
  location?: string;
  date: string;
  funding_type?: FundingType;
  organization_id: string;
  subject_area_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  number_of_participants?: number;
  collaborators?: string[];
  event_format?: string;
  published_in?: string;
};

export type ActivityParticipant = {
  activity_id: string;
  user_id: string;
  created_at: string;
};

export type ProjectStatus = 
  | 'applied'
  | 'waiting_for_decision'
  | 'fund_granted'
  | 'rejected'
  | 'ongoing'
  | 'completed';

export type Project = {
  id: string;
  name: string;
  funding_source?: string;
  fund_sum_applied?: number;
  geographic_area?: string;
  project_leader_id?: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  attachments?: string[];
  organization_id: string;
  created_at: string;
  updated_at: string;
};

export type ProjectUser = {
  project_id: string;
  user_id: string;
  created_at: string;
};

export type ProjectSubjectArea = {
  project_id: string;
  subject_area_id: string;
  created_at: string;
};

export type ExportType = 
  | 'pdf'
  | 'docx';

export type Report = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  generated_by: string;
  generated_at: string;
  export_type: ExportType;
  file_url?: string;
};

export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'export'
  | 'role_change'
  | 'login'
  | 'logout';

export type AuditLog = {
  id: string;
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  timestamp: string;
  ip_address?: string;
};

// Database tables type
export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'created_at' | 'updated_at'> & Partial<Pick<Organization, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<Organization, 'id' | 'created_at' | 'updated_at'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'updated_at'> & Partial<Pick<User, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'created_at'> & Partial<Pick<UserRole, 'created_at'>>;
        Update: Partial<Omit<UserRole, 'created_at'>>;
      };
      subject_areas: {
        Row: SubjectArea;
        Insert: Omit<SubjectArea, 'created_at' | 'updated_at'> & Partial<Pick<SubjectArea, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<SubjectArea, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_subject_areas: {
        Row: UserSubjectArea;
        Insert: Omit<UserSubjectArea, 'created_at'> & Partial<Pick<UserSubjectArea, 'created_at'>>;
        Update: Partial<Omit<UserSubjectArea, 'created_at'>>;
      };
      activities: {
        Row: Activity;
        Insert: Omit<Activity, 'created_at' | 'updated_at'> & Partial<Pick<Activity, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<Activity, 'id' | 'created_at' | 'updated_at'>>;
      };
      activity_participants: {
        Row: ActivityParticipant;
        Insert: Omit<ActivityParticipant, 'created_at'> & Partial<Pick<ActivityParticipant, 'created_at'>>;
        Update: Partial<Omit<ActivityParticipant, 'created_at'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'created_at' | 'updated_at'> & Partial<Pick<Project, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>;
      };
      project_users: {
        Row: ProjectUser;
        Insert: Omit<ProjectUser, 'created_at'> & Partial<Pick<ProjectUser, 'created_at'>>;
        Update: Partial<Omit<ProjectUser, 'created_at'>>;
      };
      project_subject_areas: {
        Row: ProjectSubjectArea;
        Insert: Omit<ProjectSubjectArea, 'created_at'> & Partial<Pick<ProjectSubjectArea, 'created_at'>>;
        Update: Partial<Omit<ProjectSubjectArea, 'created_at'>>;
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, 'generated_at'> & Partial<Pick<Report, 'id' | 'generated_at'>>;
        Update: Partial<Omit<Report, 'id' | 'generated_at'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'timestamp'> & Partial<Pick<AuditLog, 'id' | 'timestamp'>>;
        Update: Partial<Omit<AuditLog, 'id' | 'timestamp'>>;
      };
    };
  };
};
