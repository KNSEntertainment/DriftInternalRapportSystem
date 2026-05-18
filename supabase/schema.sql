-- DriftRapport Database Schema
-- Internal reporting platform for equality centers

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  title TEXT,
  work_percentage INTEGER CHECK (work_percentage >= 0 AND work_percentage <= 100),
  employment_type TEXT,
  start_date DATE,
  end_date DATE,
  remarks TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'leder', 'nesteder', 'kommunikasjonsrådgiver', 'regnskap', 'employee', 'subject_area_leader')),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role, organization_id)
);

-- Subject areas table
CREATE TABLE subject_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  annual_objective TEXT,
  action_plan TEXT,
  leader_id UUID REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, organization_id)
);

-- Many-to-many relationship between users and subject areas
CREATE TABLE user_subject_areas (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_area_id UUID NOT NULL REFERENCES subject_areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, subject_area_id)
);

-- Activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('participated_event', 'arranged_event', 'publication')),
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  location TEXT,
  date DATE NOT NULL,
  funding_type TEXT CHECK (funding_type IN ('internal', 'external', 'grant', 'collaboration')),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  subject_area_id UUID REFERENCES subject_areas(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  number_of_participants INTEGER CHECK (number_of_participants >= 0),
  collaborators TEXT[], -- Array of collaborator names/organizations
  event_format TEXT,
  published_in TEXT
);

-- Activity participants (many-to-many between users and activities)
CREATE TABLE activity_participants (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (activity_id, user_id)
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  funding_source TEXT,
  fund_sum_applied DECIMAL(12,2) CHECK (fund_sum_applied >= 0),
  geographic_area TEXT,
  project_leader_id UUID REFERENCES users(id),
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('applied', 'waiting_for_decision', 'fund_granted', 'rejected', 'ongoing', 'completed')),
  start_date DATE,
  end_date DATE,
  attachments TEXT[], -- Array of file URLs
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many relationship between projects and users
CREATE TABLE project_users (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Many-to-many relationship between projects and subject areas
CREATE TABLE project_subject_areas (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  subject_area_id UUID NOT NULL REFERENCES subject_areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, subject_area_id)
);

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'docx')),
  file_url TEXT
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'export', 'role_change')),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET
);

-- Indexes for performance
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_subject_areas_organization_id ON subject_areas(organization_id);
CREATE INDEX idx_subject_areas_leader_id ON subject_areas(leader_id);
CREATE INDEX idx_activities_organization_id ON activities(organization_id);
CREATE INDEX idx_activities_subject_area_id ON activities(subject_area_id);
CREATE INDEX idx_activities_created_by ON activities(created_by);
CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activity_participants_activity_id ON activity_participants(activity_id);
CREATE INDEX idx_activity_participants_user_id ON activity_participants(user_id);
CREATE INDEX idx_projects_organization_id ON projects(organization_id);
CREATE INDEX idx_projects_project_leader_id ON projects(project_leader_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_users_project_id ON project_users(project_id);
CREATE INDEX idx_project_users_user_id ON project_users(user_id);
CREATE INDEX idx_project_subject_areas_project_id ON project_subject_areas(project_id);
CREATE INDEX idx_project_subject_areas_subject_area_id ON project_subject_areas(subject_area_id);
CREATE INDEX idx_reports_generated_by ON reports(generated_by);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Functions to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subject_areas_updated_at BEFORE UPDATE ON subject_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subject_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_subject_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations policies - all authenticated users can read, only admins can write
CREATE POLICY "Organizations are viewable by all authenticated users" ON organizations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Only admins can insert organizations" ON organizations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Only admins can update organizations" ON organizations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Only admins can delete organizations" ON organizations FOR DELETE USING (auth.role() = 'authenticated');

-- Users policies - users can see their own organization's users, admins can manage all
CREATE POLICY "Users can view users in their organization" ON users FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage users" ON users FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User roles policies
CREATE POLICY "Users can view roles in their organization" ON user_roles FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Admins can manage user roles" ON user_roles FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Subject areas policies
CREATE POLICY "Users can view subject areas in their organization" ON subject_areas FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Subject area leaders can manage their areas" ON subject_areas FOR ALL USING (
  auth.role() = 'authenticated' AND 
  leader_id = auth.uid()
);
CREATE POLICY "Admins can manage subject areas" ON subject_areas FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Activities policies
CREATE POLICY "Users can view activities in their organization" ON activities FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Users can create activities" ON activities FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  created_by = auth.uid() AND 
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Users can update their own activities" ON activities FOR UPDATE USING (
  auth.role() = 'authenticated' AND 
  created_by = auth.uid()
);
CREATE POLICY "Admins can manage activities" ON activities FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Projects policies
CREATE POLICY "Users can view projects in their organization" ON projects FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);
CREATE POLICY "Project leaders can manage their projects" ON projects FOR ALL USING (
  auth.role() = 'authenticated' AND 
  project_leader_id = auth.uid()
);
CREATE POLICY "Admins can manage projects" ON projects FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Reports policies
CREATE POLICY "Users can view their own reports" ON reports FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  generated_by = auth.uid()
);
CREATE POLICY "Admins can view all reports" ON reports FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  generated_by = auth.uid()
);

-- Audit logs policies - users can only see logs for their own organization
CREATE POLICY "Users can view audit logs in their organization" ON audit_logs FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  user_id IN (
    SELECT id FROM users 
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

-- Insert initial data
INSERT INTO organizations (name) VALUES 
  ('Likestillingssenteret KUN'),
  ('Likestillingssenteret på Vestlandet');
