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
import { Loader2, Plus, Edit, Trash2, Calendar, MapPin, ExternalLink, Users, FileText, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { auditHelpers } from '@/lib/audit';

interface SimpleActivity {
  id: string;
  type: 'participated_event' | 'arranged_event' | 'publication';
  title: string;
  description?: string;
  link?: string;
  location?: string;
  date: string;
  funding_type?: 'internal' | 'external' | 'grant' | 'collaboration';
  organization_id: string;
  subject_area_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  number_of_participants?: number;
  collaborators?: string[];
  event_format?: string;
  published_in?: string;
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

interface SimpleUser {
  id: string;
  full_name: string;
  email: string;
}

interface ActivityWithDetails extends SimpleActivity {
  organizations: SimpleOrganization;
  subject_areas?: SimpleSubjectArea;
  creator: SimpleUser;
  activity_participants?: Array<{
    user_id: string;
    activity_id: string;
    created_at: string;
  }>;
}

export default function ActivitiesPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityWithDetails[]>([]);
  const [subjectAreas, setSubjectAreas] = useState<SimpleSubjectArea[]>([]);
  const [organizations, setOrganizations] = useState<SimpleOrganization[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithDetails | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubjectArea, setFilterSubjectArea] = useState<string>('all');

  // Form state
  const [formData, setFormData] = useState({
    type: 'participated_event' as 'participated_event' | 'arranged_event' | 'publication',
    title: '',
    description: '',
    link: '',
    location: '',
    date: '',
    funding_type: '',
    subject_area_id: '',
    number_of_participants: '',
    collaborators: '',
    event_format: '',
    published_in: '',
    participant_ids: [] as string[],
  });

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchActivities();
      fetchSubjectAreas();
      fetchOrganizations();
      fetchUsers();
    }
  }, [currentUser, loading, router]);

  const fetchActivities = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('activities')
        .select(`
          *,
          organizations(*),
          subject_areas(*),
          creator:users!activities_created_by_fkey(id, full_name, email),
          activity_participants(*)
        `)
        .order('date', { ascending: false });

      // Filter by organization if not admin
      if (currentUser && !currentUser.roles.includes('admin')) {
        query = query.eq('organization_id', currentUser.organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities((data as ActivityWithDetails[]) || []);
    } catch (err) {
      setError('Kunne ikke hente aktiviteter');
      console.error(err);
    } finally {
      setIsLoading(false);
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

  const fetchUsers = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('users')
        .select('id, full_name, email')
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

  const handleCreateActivity = async () => {
    if (!currentUser) return;

    const supabase = getSupabase();
    try {
      setError(null);
      
      // Create the activity
      const { data: newActivity, error: activityError } = await ((supabase
        .from('activities') as any)
        .insert({
          type: formData.type,
          title: formData.title,
          description: formData.description || null,
          link: formData.link || null,
          location: formData.location || null,
          date: formData.date || null,
          funding_type: formData.funding_type || null,
          organization_id: currentUser.organizationId,
          subject_area_id: formData.subject_area_id || null,
          created_by: currentUser.id,
          number_of_participants: formData.number_of_participants ? parseInt(formData.number_of_participants) : null,
          collaborators: formData.collaborators ? formData.collaborators.split(',').map(c => c.trim()) : null,
          event_format: formData.event_format || null,
          published_in: formData.published_in || null,
        })
        .select()
        .single());

      if (activityError) throw activityError;

      // Add participants if any
      if (formData.participant_ids.length > 0) {
        const participantInserts = formData.participant_ids.map(userId => ({
          activity_id: (newActivity as any).id,
          user_id: userId,
        }));

        await ((supabase
          .from('activity_participants') as any)
          .insert(participantInserts));
      }

      // Log audit entry
      await auditHelpers.logActivityCreated(currentUser.id, newActivity);

      // Reset form and refresh
      setFormData({
        type: 'participated_event',
        title: '',
        description: '',
        link: '',
        location: '',
        date: '',
        funding_type: '',
        subject_area_id: '',
        number_of_participants: '',
        collaborators: '',
        event_format: '',
        published_in: '',
        participant_ids: [],
      });
      setIsCreateDialogOpen(false);
      fetchActivities();
    } catch (err) {
      setError('Kunne ikke opprette aktivitet');
      console.error(err);
    }
  };

  const handleEditActivity = async () => {
    if (!selectedActivity || !currentUser) return;

    const supabase = getSupabase();
    try {
      setError(null);
      
      // Update the activity
      const { error: activityError } = await ((supabase
        .from('activities') as any)
        .update({
          type: formData.type,
          title: formData.title,
          description: formData.description || null,
          link: formData.link || null,
          location: formData.location || null,
          date: formData.date || null,
          funding_type: formData.funding_type || null,
          subject_area_id: formData.subject_area_id || null,
          number_of_participants: formData.number_of_participants ? parseInt(formData.number_of_participants) : null,
          collaborators: formData.collaborators ? formData.collaborators.split(',').map(c => c.trim()) : null,
          event_format: formData.event_format || null,
          published_in: formData.published_in || null,
        })
        .eq('id', selectedActivity.id));

      if (activityError) throw activityError;

      // Update participants - delete existing and insert new
      await ((supabase
        .from('activity_participants') as any)
        .delete()
        .eq('activity_id', selectedActivity.id));

      if (formData.participant_ids.length > 0) {
        const participantInserts = formData.participant_ids.map(userId => ({
          activity_id: selectedActivity.id,
          user_id: userId,
        }));

        await ((supabase
          .from('activity_participants') as any)
          .insert(participantInserts));
      }

      // Log audit entry for activity update
      const updatedActivity = { ...selectedActivity, ...formData };
      await auditHelpers.logActivityUpdated(currentUser.id, updatedActivity, selectedActivity);

      setIsEditDialogOpen(false);
      setSelectedActivity(null);
      fetchActivities();
    } catch (err) {
      setError('Kunne ikke oppdatere aktivitet');
      console.error(err);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne aktiviteten?')) return;

    const supabase = getSupabase();
    try {
      setError(null);
      
      const { error } = await (supabase
        .from('activities')
        .delete()
        .eq('id', activityId) as any);

      if (error) throw error;
      
      // Log audit entry for activity deletion
      const deletedActivity = activities.find(a => a.id === activityId);
      if (deletedActivity && currentUser) {
        await auditHelpers.logActivityDeleted(currentUser.id, deletedActivity);
      }
      
      fetchActivities();
    } catch (err) {
      setError('Kunne ikke slette aktivitet');
      console.error(err);
    }
  };

  const openEditDialog = (activity: ActivityWithDetails) => {
    setSelectedActivity(activity);
    setFormData({
      type: activity.type,
      title: activity.title,
      description: activity.description || '',
      link: activity.link || '',
      location: activity.location || '',
      date: activity.date,
      funding_type: activity.funding_type || '',
      subject_area_id: activity.subject_area_id || '',
      number_of_participants: activity.number_of_participants?.toString() || '',
      collaborators: activity.collaborators?.join(', ') || '',
      event_format: activity.event_format || '',
      published_in: activity.published_in || '',
      participant_ids: activity.activity_participants?.map(p => p.user_id) || [],
    });
    setIsEditDialogOpen(true);
  };

  const canEditActivity = (activity: ActivityWithDetails) => {
    if (!currentUser) return false;
    if (currentUser.roles.includes('admin')) return true;
    return activity.created_by === currentUser.id;
  };

  const filteredActivities = activities.filter(activity => {
    const typeMatch = filterType === 'all' || activity.type === filterType;
    const subjectMatch = filterSubjectArea === 'all' || activity.subject_area_id === filterSubjectArea;
    return typeMatch && subjectMatch;
  });

  const getActivityTypeLabel = (type: string) => {
    switch (type) {
      case 'participated_event': return 'Deltakelse';
      case 'arranged_event': return 'Arrangement';
      case 'publication': return 'Publikasjon';
      default: return type;
    }
  };

  const getFundingTypeLabel = (type: string) => {
    switch (type) {
      case 'internal': return 'Intern';
      case 'external': return 'Ekstern';
      case 'grant': return 'Stipend';
      case 'collaboration': return 'Samarbeid';
      default: return type;
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
            <h1 className="text-3xl font-bold text-gray-900">Aktiviteter</h1>
            <p className="text-gray-600 mt-1">Registrer og følg opp aktiviteter, arrangementer og publikasjoner</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ny aktivitet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrer ny aktivitet</DialogTitle>
                <DialogDescription>
                  Legg til en ny aktivitet, arrangement eller publikasjon
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="participated_event">Deltakelse</SelectItem>
                      <SelectItem value="arranged_event">Arrangement</SelectItem>
                      <SelectItem value="publication">Publikasjon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Tittel *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e: any) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beskrivelse</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detaljer om aktiviteten..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Dato *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e: any) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject_area_id">Emneområde</Label>
                  <Select
                    value={formData.subject_area_id}
                    onValueChange={(value) => setFormData({ ...formData, subject_area_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg emneområde (valgfritt)" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectAreas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional fields based on type */}
                {(formData.type === 'participated_event' || formData.type === 'arranged_event') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="location">Sted</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e: any) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="Hvor fant aktiviteten sted?"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="event_format">Format</Label>
                      <Input
                        id="event_format"
                        value={formData.event_format}
                        onChange={(e: any) => setFormData({ ...formData, event_format: e.target.value })}
                        placeholder="f.eks. webinar, konferanse, workshop"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="number_of_participants">Antall deltakere</Label>
                      <Input
                        id="number_of_participants"
                        type="number"
                        min="0"
                        value={formData.number_of_participants}
                        onChange={(e: any) => setFormData({ ...formData, number_of_participants: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {formData.type === 'publication' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="published_in">Publisert i</Label>
                      <Input
                        id="published_in"
                        value={formData.published_in}
                        onChange={(e: any) => setFormData({ ...formData, published_in: e.target.value })}
                        placeholder="Navn på publikasjon/medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="link">Lenke</Label>
                      <Input
                        id="link"
                        value={formData.link}
                        onChange={(e: any) => setFormData({ ...formData, link: e.target.value })}
                        placeholder="URL til publikasjonen"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="funding_type">Finansiering</Label>
                  <Select
                    value={formData.funding_type}
                    onValueChange={(value) => setFormData({ ...formData, funding_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg finansieringstype (valgfritt)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Intern</SelectItem>
                      <SelectItem value="external">Ekstern</SelectItem>
                      <SelectItem value="grant">Stipend</SelectItem>
                      <SelectItem value="collaboration">Samarbeid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collaborators">Samarbeidspartnere</Label>
                  <Input
                    id="collaborators"
                    value={formData.collaborators}
                    onChange={(e: any) => setFormData({ ...formData, collaborators: e.target.value })}
                    placeholder="Separer med komma"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Deltakere</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`participant-${user.id}`}
                          checked={formData.participant_ids.includes(user.id)}
                          onChange={(e: any) => {
                            if (e.target.checked) {
                              setFormData({ 
                                ...formData, 
                                participant_ids: [...formData.participant_ids, user.id] 
                              });
                            } else {
                              setFormData({ 
                                ...formData, 
                                participant_ids: formData.participant_ids.filter(id => id !== user.id) 
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`participant-${user.id}`} className="text-sm">
                          {user.full_name}
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
                <Button onClick={handleCreateActivity}>
                  Registrer aktivitet
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filter:</span>
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle typer</SelectItem>
              <SelectItem value="participated_event">Deltakelse</SelectItem>
              <SelectItem value="arranged_event">Arrangement</SelectItem>
              <SelectItem value="publication">Publikasjon</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSubjectArea} onValueChange={setFilterSubjectArea}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Emneområde" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle emneområder</SelectItem>
              {subjectAreas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map((activity) => (
            <Card key={activity.id} className="h-fit">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{activity.title}</CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(activity.date), 'd. MMMM yyyy', { locale: nb })}
                      </span>
                    </CardDescription>
                  </div>
                  {canEditActivity(activity) && (
                    <div className="flex space-x-2 ml-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(activity)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteActivity(activity.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {getActivityTypeLabel(activity.type)}
                    </Badge>
                    {activity.subject_areas && (
                      <Badge variant="outline">
                        {activity.subject_areas.name}
                      </Badge>
                    )}
                    {activity.funding_type && (
                      <Badge variant="outline">
                        {getFundingTypeLabel(activity.funding_type)}
                      </Badge>
                    )}
                  </div>

                  {activity.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {activity.description}
                    </p>
                  )}

                  {activity.location && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{activity.location}</span>
                    </div>
                  )}

                  {activity.link && (
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="h-4 w-4 text-gray-500" />
                      <a
                        href={activity.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Lenke
                      </a>
                    </div>
                  )}

                  {activity.published_in && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FileText className="h-4 w-4" />
                      <span>{activity.published_in}</span>
                    </div>
                  )}

                  {activity.number_of_participants && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{activity.number_of_participants} deltakere</span>
                    </div>
                  )}

                  {activity.collaborators && activity.collaborators.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Samarbeidspartnere:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activity.collaborators.map((collaborator, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {collaborator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Opprettet av {activity.creator.full_name}
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
            <DialogTitle>Rediger aktivitet</DialogTitle>
            <DialogDescription>
              Oppdater informasjon om aktiviteten
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participated_event">Deltakelse</SelectItem>
                  <SelectItem value="arranged_event">Arrangement</SelectItem>
                  <SelectItem value="publication">Publikasjon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Tittel *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Beskrivelse</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-link">Lenke</Label>
              <Input
                id="edit-link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Sted</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Dato</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-funding_type">Finansiering</Label>
              <Select
                value={formData.funding_type}
                onValueChange={(value) => setFormData({ ...formData, funding_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg finansieringstype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Intern</SelectItem>
                  <SelectItem value="external">Ekstern</SelectItem>
                  <SelectItem value="grant">Stipend</SelectItem>
                  <SelectItem value="collaboration">Samarbeid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-subject_area_id">Emneområde</Label>
              <Select
                value={formData.subject_area_id}
                onValueChange={(value) => setFormData({ ...formData, subject_area_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg emneområde" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Ingen emneområde</SelectItem>
                  {subjectAreas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-number_of_participants">Antall deltakere</Label>
              <Input
                id="edit-number_of_participants"
                type="number"
                value={formData.number_of_participants}
                onChange={(e) => setFormData({ ...formData, number_of_participants: e.target.value })}
                placeholder="Antall deltakere"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-collaborators">Samarbeidspartnere</Label>
              <Input
                id="edit-collaborators"
                value={formData.collaborators}
                onChange={(e) => setFormData({ ...formData, collaborators: e.target.value })}
                placeholder="Navn1, Navn2, Navn3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-event_format">Format</Label>
              <Input
                id="edit-event_format"
                value={formData.event_format}
                onChange={(e) => setFormData({ ...formData, event_format: e.target.value })}
                placeholder="f.eks. digital, fysisk, hybrid"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-published_in">Publisert i</Label>
              <Input
                id="edit-published_in"
                value={formData.published_in}
                onChange={(e) => setFormData({ ...formData, published_in: e.target.value })}
                placeholder="Tidsskrift, konferanse etc."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleEditActivity}>
              Lagre endringer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
