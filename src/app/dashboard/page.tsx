'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Calendar, FileText, Settings, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    activitiesThisMonth: 0,
    activeProjects: 0,
    generatedReports: 0,
    hoursThisWeek: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    if (!user) return;
    
    try {
      const supabase = getSupabase();
      
      // Get current date ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      
      // Fetch activities this month
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, date, number_of_participants')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .eq('created_by', user.id);
      
      // Fetch projects with active statuses (not completed or rejected)
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .in('status', ['applied', 'waiting_for_decision', 'fund_granted', 'ongoing']);
      
      // Fetch reports count
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('id');
      
      // Calculate hours this week from activities (using number_of_participants as proxy for hours)
      // This is a temporary solution - ideally we'd have a dedicated time tracking table
      const weekActivities = (activitiesData as any[])?.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate >= weekStart && activityDate <= now;
      }) || [];
      
      // Calculate total hours (using number_of_participants as hours proxy)
      const totalHoursThisWeek = weekActivities.reduce((total: number, activity: any) => {
        return total + (activity.number_of_participants || 0);
      }, 0);
      
      setStats({
        activitiesThisMonth: activitiesData?.length || 0,
        activeProjects: projectsData?.length || 0,
        generatedReports: reportsData?.length || 0,
        hoursThisWeek: totalHoursThisWeek
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">DriftRapport</h1>
              <Badge variant="outline">{user.roles.join(', ')}</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user.fullName || user.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logg ut
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Velkommen tilbake, {user.fullName || user.email}!
          </h2>
          <p className="text-gray-600 mt-1">
            Her er din oversikt for {new Date().toLocaleDateString('no-NO', { year: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mine Aktiviteter</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.activitiesThisMonth}
              </div>
              <p className="text-xs text-muted-foreground">Denne måneden</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prosjekter</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.activeProjects}
              </div>
              <p className="text-xs text-muted-foreground">Aktive prosjekter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rapporter</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.generatedReports}
              </div>
              <p className="text-xs text-muted-foreground">Generert</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timer</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.hoursThisWeek}
              </div>
              <p className="text-xs text-muted-foreground">Denne uken</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 w-full"
                onClick={() => router.push('/time-tracking')}
              >
                Logg tid
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Registrer Aktivitet</CardTitle>
              <CardDescription>
                Legg til en ny aktivitet, arrangement eller publikasjon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => router.push('/activities')}>Ny Aktivitet</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prosjekter</CardTitle>
              <CardDescription>
                Se og administrer dine prosjekter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => router.push('/projects')}>Se Prosjekter</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rapporter</CardTitle>
              <CardDescription>
                Generer og eksporter rapporter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => router.push('/reports')}>Generer Rapport</Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin Section */}
        {user.roles.includes('admin') && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Administrasjon</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="w-full" onClick={() => router.push('/admin/users')}>
                <User className="h-4 w-4 mr-2" />
                Brukere
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/admin/subject-areas')}>
                <Settings className="h-4 w-4 mr-2" />
                Innstillinger
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/admin/audit')}>
                <FileText className="h-4 w-4 mr-2" />
                Systemrapporter
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push('/activities')}>
                <Calendar className="h-4 w-4 mr-2" />
                Kalender
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
