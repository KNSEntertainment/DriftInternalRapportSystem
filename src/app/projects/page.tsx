'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Edit, Trash2, Users, DollarSign, MapPin, Calendar, FileText, CheckCircle, Clock, XCircle, AlertCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { auditHelpers } from '@/lib/audit';

interface SimpleProject {
  id: string;
  name: string;
  funding_source?: string;
  fund_sum_applied?: number;
  geographic_area?: string;
  project_leader_id?: string;
  description?: string;
  status: 'applied' | 'waiting_for_decision' | 'fund_granted' | 'rejected' | 'ongoing' | 'completed';
  start_date?: string;
  end_date?: string;
  attachments?: string[];
  organization_id: string;
  created_at: string;
  updated_at: string;
}

interface SimpleUser {
  id: string;
  full_name: string;
  email: string;
  organization_id: string;
}

interface SimpleSubjectArea {
  id: string;
  name: string;
  organization_id: string;
}

interface SimpleOrganization {
  id: string;
  name: string;
}

interface ProjectWithDetails extends SimpleProject {
  organizations: SimpleOrganization;
  project_leader?: SimpleUser;
  project_users?: Array<{
    user_id: string;
    project_id: string;
    created_at: string;
  }>;
  project_subject_areas?: Array<{
    project_id: string;
    subject_area_id: string;
    created_at: string;
  }>;
  subject_areas?: SimpleSubjectArea[];
}

export default function ProjectsPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [subjectAreas, setSubjectAreas] = useState<SimpleSubjectArea[]>([]);
  const [organizations, setOrganizations] = useState<SimpleOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    funding_source: '',
    fund_sum_applied: '',
    geographic_area: '',
    project_leader_id: '',
    description: '',
    status: 'applied' as SimpleProject['status'],
    start_date: '',
    end_date: '',
    user_ids: [] as string[],
    subject_area_ids: [] as string[],
  });

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchProjects();
      fetchUsers();
      fetchSubjectAreas();
      fetchOrganizations();
    }
  }, [currentUser, loading, router]);

  const fetchProjects = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('projects')
        .select(`
          *,
          organizations(*),
          project_leader:users!projects_project_leader_id_fkey(id, full_name, email, organization_id),
          project_users(*),
          project_subject_areas(*)
        `)
        .order('created_at', { ascending: false });

      // Filter by organization if not admin
      if (currentUser && !currentUser.roles.includes('admin')) {
        query = query.eq('organization_id', currentUser.organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProjects((data as ProjectWithDetails[]) || []);
    } catch (err) {
      setError('Kunne ikke hente prosjekter');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('users')
        .select('id, full_name, email, organization_id')
        .eq('active', true);

      // Filter by organization if not admin
      if (currentUser && !currentUser.roles.includes('admin')) {
        query = query.eq('organization_id', currentUser.organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers((data as SimpleUser[]) || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchSubjectAreas = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('subject_areas')
        .select('id, name, organization_id');

      // Filter by organization if not admin
      if (currentUser && !currentUser.roles.includes('admin')) {
        query = query.eq('organization_id', currentUser.organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubjectAreas((data as SimpleSubjectArea[]) || []);
    } catch (err) {
      console.error('Error fetching subject areas:', err);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name');

      if (error) throw error;
      setOrganizations((data as SimpleOrganization[]) || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const handleCreateProject = async () => {
    if (!currentUser) return;

    const supabase = getSupabase();
    try {
      setError(null);
      
      // Create the project
      const { data: newProject, error: projectError } = await ((supabase
        .from('projects') as any)
        .insert({
          name: formData.name,
          funding_source: formData.funding_source || null,
          fund_sum_applied: formData.fund_sum_applied ? parseFloat(formData.fund_sum_applied) : null,
          geographic_area: formData.geographic_area || null,
          project_leader_id: formData.project_leader_id || null,
          description: formData.description || null,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          organization_id: currentUser.organizationId,
        })
        .select()
        .single());

      if (projectError) throw projectError;

      // Add team members
      if (formData.user_ids.length > 0) {
        const userInserts = formData.user_ids.map(userId => ({
          project_id: (newProject as any).id,
          user_id: userId,
        }));

        await ((supabase
          .from('project_users') as any)
          .insert(userInserts));
      }

      // Add subject areas
      if (formData.subject_area_ids.length > 0) {
        const subjectAreaInserts = formData.subject_area_ids.map(subjectAreaId => ({
          project_id: (newProject as any).id,
          subject_area_id: subjectAreaId,
        }));

        await ((supabase
          .from('project_subject_areas') as any)
          .insert(subjectAreaInserts));
      }

      // Log audit entry for project creation
      await auditHelpers.logProjectCreated(currentUser.id, newProject);

      // Reset form and refresh
      setFormData({
        name: '',
        funding_source: '',
        fund_sum_applied: '',
        geographic_area: '',
        project_leader_id: '',
        description: '',
        status: 'applied',
        start_date: '',
        end_date: '',
        user_ids: [],
        subject_area_ids: [],
      });
      setIsCreateDialogOpen(false);
      fetchProjects();
    } catch (err) {
      setError('Kunne ikke opprette prosjekt');
      console.error(err);
    }
  };

  const handleEditProject = async () => {
    if (!selectedProject || !currentUser) return;

    const supabase = getSupabase();
    try {
      setError(null);
      
      // Update the project
      const { error: projectError } = await ((supabase
        .from('projects') as any)
        .update({
          name: formData.name,
          funding_source: formData.funding_source || null,
          fund_sum_applied: formData.fund_sum_applied ? parseFloat(formData.fund_sum_applied) : null,
          geographic_area: formData.geographic_area || null,
          project_leader_id: formData.project_leader_id || null,
          description: formData.description || null,
          status: formData.status,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        })
        .eq('id', selectedProject.id));

      if (projectError) throw projectError;

      // Update team members - delete existing and insert new
      await ((supabase
        .from('project_users') as any)
        .delete()
        .eq('project_id', selectedProject.id));

      if (formData.user_ids.length > 0) {
        const userInserts = formData.user_ids.map(userId => ({
          project_id: selectedProject.id,
          user_id: userId,
        }));

        await ((supabase
          .from('project_users') as any)
          .insert(userInserts));
      }

      // Update subject areas - delete existing and insert new
      await ((supabase
        .from('project_subject_areas') as any)
        .delete()
        .eq('project_id', selectedProject.id));

      if (formData.subject_area_ids.length > 0) {
        const subjectAreaInserts = formData.subject_area_ids.map(subjectAreaId => ({
          project_id: selectedProject.id,
          subject_area_id: subjectAreaId,
        }));

        await ((supabase
          .from('project_subject_areas') as any)
          .insert(subjectAreaInserts));
      }

      // Log audit entry for project update
      const updatedProject = { ...selectedProject, ...formData };
      await auditHelpers.logProjectUpdated(currentUser.id, updatedProject, selectedProject);

      setIsEditDialogOpen(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      setError('Kunne ikke oppdatere prosjekt');
      console.error(err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette prosjektet?')) return;

    const supabase = getSupabase();
    try {
      setError(null);
      
      const { error } = await (supabase
        .from('projects')
        .delete()
        .eq('id', projectId) as any);

      if (error) throw error;
      
      // Log audit entry for project deletion
      const deletedProject = projects.find(p => p.id === projectId);
      if (deletedProject && currentUser) {
        await auditHelpers.logProjectDeleted(currentUser.id, deletedProject);
      }
      
      fetchProjects();
    } catch (err) {
      setError('Kunne ikke slette prosjekt');
      console.error(err);
    }
  };

  const openEditDialog = (project: ProjectWithDetails) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      funding_source: project.funding_source || '',
      fund_sum_applied: project.fund_sum_applied?.toString() || '',
      geographic_area: project.geographic_area || '',
      project_leader_id: project.project_leader_id || '',
      description: project.description || '',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      user_ids: project.project_users?.map(pu => pu.user_id) || [],
      subject_area_ids: project.project_subject_areas?.map(psa => psa.subject_area_id) || [],
    });
    setIsEditDialogOpen(true);
  };

  const canEditProject = (project: ProjectWithDetails) => {
    if (!currentUser) return false;
    if (currentUser.roles.includes('admin')) return true;
    if (currentUser.roles.includes('regnskap')) return true;
    return project.project_leader_id === currentUser.id;
  };

  const filteredProjects = projects.filter(project => {
    return filterStatus === 'all' || project.status === filterStatus;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'applied': return 'Søkt';
      case 'waiting_for_decision': return 'Venter på vedtak';
      case 'fund_granted': return 'Midler bevilget';
      case 'rejected': return 'Avslått';
      case 'ongoing': return 'Pågående';
      case 'completed': return 'Fullført';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <Clock className="h-4 w-4" />;
      case 'waiting_for_decision': return <AlertCircle className="h-4 w-4" />;
      case 'fund_granted': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'ongoing': return <Users className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-yellow-100 text-yellow-800';
      case 'waiting_for_decision': return 'bg-blue-100 text-blue-800';
      case 'fund_granted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'ongoing': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prosjekter</h1>
            <p className="text-gray-600 mt-1">Administrer prosjekter, finansiering og team</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nytt prosjekt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Opprett nytt prosjekt</DialogTitle>
                <DialogDescription>
                  Registrer et nytt prosjekt med finansiering og team
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Prosjektnavn *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beskrivelse</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Beskriv prosjektet..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="funding_source">Finansieringskilde</Label>
                    <Input
                      id="funding_source"
                      value={formData.funding_source}
                      onChange={(e: any) => setFormData({ ...formData, funding_source: e.target.value })}
                      placeholder="f.eks. NFR, EU, Direktoratet"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fund_sum_applied">Søkt beløp (kr)</Label>
                    <Input
                      id="fund_sum_applied"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.fund_sum_applied}
                      onChange={(e: any) => setFormData({ ...formData, fund_sum_applied: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="geographic_area">Geografisk område</Label>
                    <Input
                      id="geographic_area"
                      value={formData.geographic_area}
                      onChange={(e: any) => setFormData({ ...formData, geographic_area: e.target.value })}
                      placeholder="f.eks. Norge, Norden, Europa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project_leader_id">Prosjektleder</Label>
                    <Select
                      value={formData.project_leader_id}
                      onValueChange={(value) => setFormData({ ...formData, project_leader_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg prosjektleder (valgfritt)" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="applied">Søkt</SelectItem>
                        <SelectItem value="waiting_for_decision">Venter på vedtak</SelectItem>
                        <SelectItem value="fund_granted">Midler bevilget</SelectItem>
                        <SelectItem value="rejected">Avslått</SelectItem>
                        <SelectItem value="ongoing">Pågående</SelectItem>
                        <SelectItem value="completed">Fullført</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Startdato</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e: any) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Sluttdato</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e: any) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Teammedlemmer</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={formData.user_ids.includes(user.id)}
                          onChange={(e: any) => {
                            if (e.target.checked) {
                              setFormData({ 
                                ...formData, 
                                user_ids: [...formData.user_ids, user.id] 
                              });
                            } else {
                              setFormData({ 
                                ...formData, 
                                user_ids: formData.user_ids.filter(id => id !== user.id) 
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`user-${user.id}`} className="text-sm">
                          {user.full_name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Emneområder</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {subjectAreas.map((area) => (
                      <div key={area.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`area-${area.id}`}
                          checked={formData.subject_area_ids.includes(area.id)}
                          onChange={(e: any) => {
                            if (e.target.checked) {
                              setFormData({ 
                                ...formData, 
                                subject_area_ids: [...formData.subject_area_ids, area.id] 
                              });
                            } else {
                              setFormData({ 
                                ...formData, 
                                subject_area_ids: formData.subject_area_ids.filter(id => id !== area.id) 
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`area-${area.id}`} className="text-sm">
                          {area.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleCreateProject}>
                  Opprett prosjekt
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Project Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Rediger prosjekt</DialogTitle>
                <DialogDescription>
                  Oppdater informasjon om prosjektet
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Prosjektnavn *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Beskrivelse</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Beskriv prosjektet..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-funding_source">Finansieringskilde</Label>
                    <Input
                      id="edit-funding_source"
                      value={formData.funding_source}
                      onChange={(e: any) => setFormData({ ...formData, funding_source: e.target.value })}
                      placeholder="f.eks. NFR, EU, Direktoratet"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-fund_sum_applied">Søkt beløp (kr)</Label>
                    <Input
                      id="edit-fund_sum_applied"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.fund_sum_applied}
                      onChange={(e: any) => setFormData({ ...formData, fund_sum_applied: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-geographic_area">Geografisk område</Label>
                    <Input
                      id="edit-geographic_area"
                      value={formData.geographic_area}
                      onChange={(e: any) => setFormData({ ...formData, geographic_area: e.target.value })}
                      placeholder="f.eks. Norge, Norden, Europa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-project_leader_id">Prosjektleder</Label>
                    <Select
                      value={formData.project_leader_id}
                      onValueChange={(value) => setFormData({ ...formData, project_leader_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg prosjektleder (valgfritt)" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="applied">Søkt</SelectItem>
                        <SelectItem value="waiting_for_decision">Venter på vedtak</SelectItem>
                        <SelectItem value="fund_granted">Midler bevilget</SelectItem>
                        <SelectItem value="rejected">Avslått</SelectItem>
                        <SelectItem value="ongoing">Pågående</SelectItem>
                        <SelectItem value="completed">Fullført</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-start_date">Startdato</Label>
                    <Input
                      id="edit-start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e: any) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-end_date">Sluttdato</Label>
                  <Input
                    id="edit-end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e: any) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Teammedlemmer</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-user-${user.id}`}
                          checked={formData.user_ids.includes(user.id)}
                          onChange={(e: any) => {
                            if (e.target.checked) {
                              setFormData({ 
                                ...formData, 
                                user_ids: [...formData.user_ids, user.id] 
                              });
                            } else {
                              setFormData({ 
                                ...formData, 
                                user_ids: formData.user_ids.filter(id => id !== user.id) 
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`edit-user-${user.id}`} className="text-sm">
                          {user.full_name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Emneområder</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {subjectAreas.map((area) => (
                      <div key={area.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-area-${area.id}`}
                          checked={formData.subject_area_ids.includes(area.id)}
                          onChange={(e: any) => {
                            if (e.target.checked) {
                              setFormData({ 
                                ...formData, 
                                subject_area_ids: [...formData.subject_area_ids, area.id] 
                              });
                            } else {
                              setFormData({ 
                                ...formData, 
                                subject_area_ids: formData.subject_area_ids.filter(id => id !== area.id) 
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`edit-area-${area.id}`} className="text-sm">
                          {area.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleEditProject}>
                  Lagre endringer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Filter */}
        <div className="flex space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Status:</span>
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Alle statuser" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statuser</SelectItem>
              <SelectItem value="applied">Søkt</SelectItem>
              <SelectItem value="waiting_for_decision">Venter på vedtak</SelectItem>
              <SelectItem value="fund_granted">Midler bevilget</SelectItem>
              <SelectItem value="rejected">Avslått</SelectItem>
              <SelectItem value="ongoing">Pågående</SelectItem>
              <SelectItem value="completed">Fullført</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="h-fit">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{project.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={getStatusColor(project.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(project.status)}
                          <span>{getStatusLabel(project.status)}</span>
                        </div>
                      </Badge>
                    </div>
                  </div>
                  {canEditProject(project) && (
                    <div className="flex space-x-2 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(project)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {project.description}
                    </p>
                  )}

                  {project.funding_source && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      <span>{project.funding_source}</span>
                    </div>
                  )}

                  {project.fund_sum_applied && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className="font-medium">Søkt beløp:</span>
                      <span>{project.fund_sum_applied.toLocaleString('nb-NO')} kr</span>
                    </div>
                  )}

                  {project.geographic_area && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{project.geographic_area}</span>
                    </div>
                  )}

                  {project.project_leader && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>Leder: {project.project_leader.full_name}</span>
                    </div>
                  )}

                  {project.start_date && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(project.start_date), 'd. MMMM yyyy', { locale: nb })}
                        {project.end_date && ` - ${format(new Date(project.end_date), 'd. MMMM yyyy', { locale: nb })}`}
                      </span>
                    </div>
                  )}

                  {project.project_users && project.project_users.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{project.project_users.length} teammedlemmer</span>
                    </div>
                  )}

                  {project.subject_areas && project.subject_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.subject_areas.map((area) => (
                        <Badge key={area.id} variant="outline" className="text-xs">
                          {area.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Opprettet {format(new Date(project.created_at), 'd. MMMM yyyy', { locale: nb })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
