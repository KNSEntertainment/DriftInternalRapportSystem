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
import { Loader2, Plus, Clock, Calendar, TrendingUp, BarChart3, Timer as TimerIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { nb } from 'date-fns/locale';
import { auditHelpers } from '@/lib/audit';

interface TimeEntry {
  id: string;
  user_id: string;
  activity_id?: string;
  project_id?: string;
  date: string;
  hours: number;
  description: string;
  created_at: string;
  activities?: { title: string };
  projects?: { name: string };
}

interface Activity {
  id: string;
  title: string;
  date: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

export default function TimeTrackingPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    activity_id: '',
    project_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: '',
    description: ''
  });

  // Statistics
  const [stats, setStats] = useState({
    totalHoursThisWeek: 0,
    totalHoursThisMonth: 0,
    totalHoursAllTime: 0,
    averageHoursPerDay: 0
  });

  const fetchTimeEntries = async () => {
    // Directly use localStorage fallback since time_entries table doesn't exist
    if (currentUser) {
      const storedEntries = localStorage.getItem(`time_entries_${currentUser.id}`);
      if (storedEntries) {
        setTimeEntries(JSON.parse(storedEntries));
      } else {
        setTimeEntries([]);
      }
    }
  };

  const fetchActivities = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('activities')
        .select('id, title, date')
        .eq('created_by', currentUser?.id || 'Employee')
        .order('date', { ascending: false });

      if (error) throw error;
      setActivities((data as Activity[]) || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setActivities([]);
    }
  };

  const fetchProjects = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .order('name');

      if (error) throw error;
      setProjects((data as Project[]) || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisWeekEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return isWithinInterval(entryDate, { start: weekStart, end: weekEnd });
    });

    const thisMonthEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= monthStart;
    });

    const totalHoursThisWeek = thisWeekEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const totalHoursThisMonth = thisMonthEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const totalHoursAllTime = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);

    const averageHoursPerDay = thisWeekEntries.length > 0 ? totalHoursThisWeek / 7 : 0;

    setStats({
      totalHoursThisWeek,
      totalHoursThisMonth,
      totalHoursAllTime,
      averageHoursPerDay
    });
  };

  const handleCreateTimeEntry = async () => {
    if (!currentUser) return;
    if (!formData.hours || parseFloat(formData.hours) <= 0) {
      setError('Vennligst angi et gyldig antall timer');
      return;
    }

    try {
      setError(null);
      
      // Create new time entry
      const newEntry: TimeEntry = {
        id: Date.now().toString(),
        user_id: currentUser.id,
        activity_id: formData.activity_id || undefined,
        project_id: formData.project_id || undefined,
        date: formData.date,
        hours: parseFloat(formData.hours),
        description: formData.description,
        created_at: new Date().toISOString(),
        activities: formData.activity_id ? activities.find(a => a.id === formData.activity_id) : undefined,
        projects: formData.project_id ? projects.find(p => p.id === formData.project_id) : undefined
      };
      
      // Save to localStorage
      const existingEntries = JSON.parse(localStorage.getItem(`time_entries_${currentUser.id}`) || '[]');
      existingEntries.unshift(newEntry);
      localStorage.setItem(`time_entries_${currentUser.id}`, JSON.stringify(existingEntries));
      
      setTimeEntries(prev => [newEntry, ...prev]);
      setSuccess('Tid logget (lokal lagring)');

      // Log audit entry for time tracking
      const { logUserAction } = await import('@/lib/audit');
      await logUserAction(currentUser.id, 'create', 'time_entry', newEntry.id, undefined, newEntry);

      setIsDialogOpen(false);
      setFormData({
        activity_id: '',
        project_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        hours: '',
        description: ''
      });
    } catch (err) {
      setError('Kunne ikke logge tid');
      console.error(err);
    }
  };

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      const loadData = async () => {
        setIsLoading(true);
        await Promise.all([
          fetchTimeEntries(),
          fetchActivities(),
          fetchProjects()
        ]);
        setIsLoading(false);
      };
      
      loadData();
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    calculateStats();
  }, [timeEntries]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tidsregistrering</h1>
            <p className="text-gray-600 mt-1">Logg og administrer din arbeidstid</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Logg tid
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Logg arbeidstid</DialogTitle>
                <DialogDescription>
                  Registrer timer for aktiviteter eller prosjekter
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Dato</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours">Antall timer *</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="f.eks. 7.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity_id">Aktivitet (valgfritt)</Label>
                  <Select
                    value={formData.activity_id}
                    onValueChange={(value) => setFormData({ ...formData, activity_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg aktivitet" />
                    </SelectTrigger>
                    <SelectContent>
                      {activities.map((activity) => (
                        <SelectItem key={activity.id} value={activity.id}>
                          {activity.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_id">Prosjekt (valgfritt)</Label>
                  <Select
                    value={formData.project_id}
                    onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg prosjekt" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Beskrivelse</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Hva jobbet du med?"
                  />
                </div>

                {error && (
                  <Alert>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <AlertDescription className="text-green-600">{success}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button onClick={handleCreateTimeEntry}>
                    Logg tid
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timer denne uken</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHoursThisWeek.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Totalt antall timer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timer denne måneden</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHoursThisMonth.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Totalt antall timer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gjennomsnitt per dag</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageHoursPerDay.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Timer per dag</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totalt antall timer</CardTitle>
              <TimerIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalHoursAllTime.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">All tid registrert</p>
            </CardContent>
          </Card>
        </div>

        {/* Time Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tidsregistreringer</CardTitle>
            <CardDescription>Dine seneste tidsregistreringer</CardDescription>
          </CardHeader>
          <CardContent>
            {timeEntries.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Ingen tidsregistreringer ennå</p>
                <p className="text-sm text-gray-500 mt-2">Klikk på "Logg tid" for å komme i gang</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dato</TableHead>
                    <TableHead>Timer</TableHead>
                    <TableHead>Aktivitet/Prosjekt</TableHead>
                    <TableHead>Beskrivelse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), 'd. MMM yyyy', { locale: nb })}</TableCell>
                      <TableCell>{entry.hours} t</TableCell>
                      <TableCell>
                        {entry.activities?.title || entry.projects?.name || (
                          <Badge variant="outline">Generell</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{entry.description || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
