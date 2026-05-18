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
import { Loader2, Plus, Edit, Trash2, Users, Target, FileText } from 'lucide-react';
import { auditHelpers } from '@/lib/audit';

interface SimpleSubjectArea {
  id: string;
  name: string;
  annual_objective?: string;
  action_plan?: string;
  leader_id?: string;
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

interface SimpleOrganization {
  id: string;
  name: string;
}

interface SubjectAreaWithDetails extends SimpleSubjectArea {
  organizations: SimpleOrganization;
  leader?: SimpleUser;
  user_subject_areas?: Array<{
    user_id: string;
    subject_area_id: string;
    created_at: string;
  }>;
}

export default function SubjectAreasPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [subjectAreas, setSubjectAreas] = useState<SubjectAreaWithDetails[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [organizations, setOrganizations] = useState<SimpleOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSubjectArea, setSelectedSubjectArea] = useState<SubjectAreaWithDetails | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    annual_objective: '',
    action_plan: '',
    leader_id: '',
    organization_id: '',
  });

  useEffect(() => {
    if (!loading && (!currentUser || (!currentUser.roles.includes('admin') && !currentUser.roles.includes('subject_area_leader')))) {
      router.push('/dashboard');
      return;
    }

    if (currentUser && (currentUser.roles.includes('admin') || currentUser.roles.includes('subject_area_leader'))) {
      fetchSubjectAreas();
      fetchUsers();
      fetchOrganizations();
    }
  }, [currentUser, loading, router]);

  const fetchSubjectAreas = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('subject_areas')
        .select(`
          *,
          organizations(*),
          leader:users!subject_areas_leader_id_fkey(id, full_name, email, organization_id),
          user_subject_areas(*)
        `);

      // If not admin, only show subject areas from user's organization
      if (currentUser && !currentUser.roles.includes('admin')) {
        query = query.eq('organization_id', currentUser.organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubjectAreas((data as SubjectAreaWithDetails[]) || []);
    } catch (err) {
      setError('Kunne ikke hente emneområder');
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

      // If not admin, only show users from user's organization
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

  const handleCreateSubjectArea = async () => {
    const supabase = getSupabase();
    try {
      setError(null);
      
      const { data: newSubjectArea, error } = await ((supabase
        .from('subject_areas') as any)
        .insert({
          name: formData.name,
          annual_objective: formData.annual_objective || null,
          action_plan: formData.action_plan || null,
          leader_id: formData.leader_id || null,
          organization_id: formData.organization_id,
        })
        .select()
        .single());

      if (error) throw error;

      // Log audit entry for subject area creation
      const { logUserAction } = await import('@/lib/audit');
      await logUserAction(currentUser?.id || 'system', 'create', 'subject_area', newSubjectArea.id, undefined, newSubjectArea);

      // Reset form and refresh
      setFormData({
        name: '',
        annual_objective: '',
        action_plan: '',
        leader_id: '',
        organization_id: '',
      });
      setIsCreateDialogOpen(false);
      fetchSubjectAreas();
    } catch (err) {
      setError('Kunne ikke opprette emneområde');
      console.error(err);
    }
  };

  const handleEditSubjectArea = async () => {
    if (!selectedSubjectArea) return;

    const supabase = getSupabase();
    try {
      setError(null);
      
      const { error } = await ((supabase
        .from('subject_areas') as any)
        .update({
          name: formData.name,
          annual_objective: formData.annual_objective || null,
          action_plan: formData.action_plan || null,
          leader_id: formData.leader_id || null,
          organization_id: formData.organization_id,
        })
        .eq('id', selectedSubjectArea.id));

      if (error) throw error;

      setIsEditDialogOpen(false);
      setSelectedSubjectArea(null);
      fetchSubjectAreas();
    } catch (err) {
      setError('Kunne ikke oppdatere emneområde');
      console.error(err);
    }
  };

  const handleDeleteSubjectArea = async (subjectAreaId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette emneområdet?')) return;
    const supabase = getSupabase();    try {
      setError(null);
      
      const { error } = await supabase
        .from('subject_areas')
        .delete()
        .eq('id', subjectAreaId);

      if (error) throw error;
      
      fetchSubjectAreas();
    } catch (err) {
      setError('Kunne ikke slette emneområde');
      console.error(err);
    }
  };

  const openEditDialog = (subjectArea: SubjectAreaWithDetails) => {
    setSelectedSubjectArea(subjectArea);
    setFormData({
      name: subjectArea.name,
      annual_objective: subjectArea.annual_objective || '',
      action_plan: subjectArea.action_plan || '',
      leader_id: subjectArea.leader_id || '',
      organization_id: subjectArea.organization_id,
    });
    setIsEditDialogOpen(true);
  };

  const canEditSubjectArea = (subjectArea: SubjectAreaWithDetails) => {
    if (!currentUser) return false;
    if (currentUser.roles.includes('admin')) return true;
    if (currentUser.roles.includes('subject_area_leader')) {
      return subjectArea.leader_id === currentUser.id || subjectArea.organization_id === currentUser.organizationId;
    }
    return false;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!currentUser || (!currentUser.roles.includes('admin') && !currentUser.roles.includes('subject_area_leader'))) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Emneområder</h1>
            <p className="text-gray-600 mt-1">Administrer faglige emneområder og ledelse</p>
          </div>
          
          {currentUser.roles.includes('admin') && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nytt emneområde
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Opprett nytt emneområde</DialogTitle>
                  <DialogDescription>
                    Legg til et nytt faglig emneområde i systemet
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Navn *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organization_id">Organisasjon *</Label>
                    <Select
                      value={formData.organization_id}
                      onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg organisasjon" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leader_id">Leder</Label>
                    <Select
                      value={formData.leader_id}
                      onValueChange={(value) => setFormData({ ...formData, leader_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg leder (valgfritt)" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(user => user.organization_id === formData.organization_id)
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="annual_objective">Årsmål</Label>
                    <Textarea
                      id="annual_objective"
                      value={formData.annual_objective}
                      onChange={(e) => setFormData({ ...formData, annual_objective: e.target.value })}
                      placeholder="Beskriv årets mål for dette emneområdet..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="action_plan">Handlingsplan</Label>
                    <Textarea
                      id="action_plan"
                      value={formData.action_plan}
                      onChange={(e) => setFormData({ ...formData, action_plan: e.target.value })}
                      placeholder="Beskriv handlingsplanen for å nå målene..."
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={handleCreateSubjectArea}>
                    Opprett emneområde
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {subjectAreas.map((subjectArea) => (
            <Card key={subjectArea.id} className="h-fit">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{subjectArea.name}</CardTitle>
                    <CardDescription>{subjectArea.organizations.name}</CardDescription>
                  </div>
                  {canEditSubjectArea(subjectArea) && (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(subjectArea)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {currentUser.roles.includes('admin') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSubjectArea(subjectArea.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjectArea.leader && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Leder: {subjectArea.leader.full_name}
                      </span>
                    </div>
                  )}

                  {subjectArea.annual_objective && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Årsmål</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {subjectArea.annual_objective}
                      </p>
                    </div>
                  )}

                  {subjectArea.action_plan && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Handlingsplan</span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {subjectArea.action_plan}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {subjectArea.user_subject_areas?.length || 0} medlemmer
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rediger emneområde</DialogTitle>
            <DialogDescription>
              Oppdater informasjon om emneområdet
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Navn *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_organization_id">Organisasjon *</Label>
              <Select
                value={formData.organization_id}
                onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg organisasjon" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_leader_id">Leder</Label>
              <Select
                value={formData.leader_id}
                onValueChange={(value) => setFormData({ ...formData, leader_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg leder (valgfritt)" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(user => user.organization_id === formData.organization_id)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_annual_objective">Årsmål</Label>
              <Textarea
                id="edit_annual_objective"
                value={formData.annual_objective}
                onChange={(e) => setFormData({ ...formData, annual_objective: e.target.value })}
                placeholder="Beskriv årets mål for dette emneområdet..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_action_plan">Handlingsplan</Label>
              <Textarea
                id="edit_action_plan"
                value={formData.action_plan}
                onChange={(e) => setFormData({ ...formData, action_plan: e.target.value })}
                placeholder="Beskriv handlingsplanen for å nå målene..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleEditSubjectArea}>
              Lagre endringer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
