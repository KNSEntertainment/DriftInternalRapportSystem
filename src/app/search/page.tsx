'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Filter, Calendar, MapPin, Users, FileText, DollarSign, ExternalLink, User, Target, Building } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface SearchResult {
  id: string;
  type: 'activity' | 'project' | 'user' | 'subject_area';
  title: string;
  description?: string;
  metadata: Record<string, any>;
  relevance_score?: number;
}

interface SimpleActivity {
  id: string;
  type: 'participated_event' | 'arranged_event' | 'publication';
  title: string;
  description?: string;
  date: string;
  location?: string;
  link?: string;
  organizations: { name: string };
  subject_areas?: { name: string };
  creator: { full_name: string };
}

interface SimpleProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  funding_source?: string;
  fund_sum_applied?: number;
  geographic_area?: string;
  organizations: { name: string };
  project_leader?: { full_name: string };
}

interface SimpleUser {
  id: string;
  full_name: string;
  email: string;
  title?: string;
  organizations: { name: string };
  user_roles: Array<{ role: string }>;
}

interface SimpleSubjectArea {
  id: string;
  name: string;
  annual_objective?: string;
  action_plan?: string;
  organizations: { name: string };
  leader?: { full_name: string };
}

export default function SearchPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<string>('all');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activities, setActivities] = useState<SimpleActivity[]>([]);
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [subjectAreas, setSubjectAreas] = useState<SimpleSubjectArea[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchAllData();
    }
  }, [currentUser, loading, router]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchActivities(),
        fetchProjects(),
        fetchUsers(),
        fetchSubjectAreas(),
        fetchOrganizations(),
      ]);
    } catch (err) {
      setError('Kunne ikke hente data for søk');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('activities')
        .select(`
          id,
          type,
          title,
          description,
          date,
          location,
          link,
          organizations(name),
          subject_areas(name),
          creator:users(full_name)
        `)
        .order('date', { ascending: false });

      if (currentUser && !currentUser.roles.includes('admin')) {
        query = query.eq('organization_id', currentUser.organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setActivities((data as SimpleActivity[]) || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          status,
          funding_source,
          fund_sum_applied,
          geographic_area,
          organizations(name),
          project_leader:users(full_name)
        `)
        .order('created_at', { ascending: false });

      if (currentUser && !currentUser.roles.includes('admin')) {
        query = query.eq('organization_id', currentUser.organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProjects((data as SimpleProject[]) || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const supabase = getSupabase();
      let query = supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          title,
          organizations(name),
          user_roles(role)
        `)
        .eq('active', true)
        .order('full_name');

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
        .select(`
          id,
          name,
          annual_objective,
          action_plan,
          organizations(name),
          leader:users(full_name)
        `)
        .order('name');

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
        .select('id, name')
        .order('name');

      if (error) throw error;
      setOrganizations((data as { id: string; name: string }[]) || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search activities
    if (searchType === 'all' || searchType === 'activity') {
      activities.forEach(activity => {
        const titleMatch = activity.title.toLowerCase().includes(query);
        const descMatch = activity.description?.toLowerCase().includes(query);
        const orgMatch = activity.organizations.name.toLowerCase().includes(query);
        const areaMatch = activity.subject_areas?.name.toLowerCase().includes(query);
        const creatorMatch = activity.creator.full_name.toLowerCase().includes(query);

        if (titleMatch || descMatch || orgMatch || areaMatch || creatorMatch) {
          results.push({
            id: activity.id,
            type: 'activity',
            title: activity.title,
            description: activity.description,
            metadata: {
              date: activity.date,
              location: activity.location,
              link: activity.link,
              type: activity.type,
              organization: activity.organizations.name,
              subjectArea: activity.subject_areas?.name,
              creator: activity.creator.full_name,
            },
          });
        }
      });
    }

    // Search projects
    if (searchType === 'all' || searchType === 'project') {
      projects.forEach(project => {
        const titleMatch = project.name.toLowerCase().includes(query);
        const descMatch = project.description?.toLowerCase().includes(query);
        const orgMatch = project.organizations.name.toLowerCase().includes(query);
        const fundingMatch = project.funding_source?.toLowerCase().includes(query);
        const leaderMatch = project.project_leader?.full_name.toLowerCase().includes(query);

        if (titleMatch || descMatch || orgMatch || fundingMatch || leaderMatch) {
          results.push({
            id: project.id,
            type: 'project',
            title: project.name,
            description: project.description,
            metadata: {
              status: project.status,
              fundingSource: project.funding_source,
              fundSum: project.fund_sum_applied,
              geographicArea: project.geographic_area,
              organization: project.organizations.name,
              leader: project.project_leader?.full_name,
            },
          });
        }
      });
    }

    // Search users
    if (searchType === 'all' || searchType === 'user') {
      users.forEach(user => {
        const nameMatch = user.full_name.toLowerCase().includes(query);
        const emailMatch = user.email.toLowerCase().includes(query);
        const titleMatch = user.title?.toLowerCase().includes(query);
        const orgMatch = user.organizations.name.toLowerCase().includes(query);
        const roleMatch = user.user_roles.some(role => role.role.toLowerCase().includes(query));

        if (nameMatch || emailMatch || titleMatch || orgMatch || roleMatch) {
          results.push({
            id: user.id,
            type: 'user',
            title: user.full_name,
            description: user.title,
            metadata: {
              email: user.email,
              title: user.title,
              organization: user.organizations.name,
              roles: user.user_roles.map(r => r.role),
            },
          });
        }
      });
    }

    // Search subject areas
    if (searchType === 'all' || searchType === 'subject_area') {
      subjectAreas.forEach(area => {
        const nameMatch = area.name.toLowerCase().includes(query);
        const objMatch = area.annual_objective?.toLowerCase().includes(query);
        const planMatch = area.action_plan?.toLowerCase().includes(query);
        const orgMatch = area.organizations.name.toLowerCase().includes(query);
        const leaderMatch = area.leader?.full_name.toLowerCase().includes(query);

        if (nameMatch || objMatch || planMatch || orgMatch || leaderMatch) {
          results.push({
            id: area.id,
            type: 'subject_area',
            title: area.name,
            description: area.annual_objective,
            metadata: {
              actionPlan: area.action_plan,
              organization: area.organizations.name,
              leader: area.leader?.full_name,
            },
          });
        }
      });
    }

    // Apply filters
    return results.filter(result => {
      // Organization filter
      if (organizationFilter !== 'all' && result.metadata.organization !== organizationFilter) {
        return false;
      }

      // Date filter (simplified - just for activities and projects with dates)
      if (dateFilter !== 'all') {
        if (result.type === 'activity' && result.metadata.date) {
          const resultDate = new Date(result.metadata.date);
          const now = new Date();
          
          switch (dateFilter) {
            case 'this_month':
              if (resultDate.getMonth() !== now.getMonth() || resultDate.getFullYear() !== now.getFullYear()) {
                return false;
              }
              break;
            case 'last_month':
              const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
              if (resultDate.getMonth() !== lastMonth.getMonth() || resultDate.getFullYear() !== lastMonth.getFullYear()) {
                return false;
              }
              break;
            case 'this_year':
              if (resultDate.getFullYear() !== now.getFullYear()) {
                return false;
              }
              break;
          }
        }
      }

      return true;
    });
  }, [searchQuery, searchType, organizationFilter, dateFilter, activities, projects, users, subjectAreas]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'activity': return 'Aktivitet';
      case 'project': return 'Prosjekt';
      case 'user': return 'Bruker';
      case 'subject_area': return 'Emneområde';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'activity': return <Calendar className="h-4 w-4" />;
      case 'project': return <Target className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'subject_area': return <FileText className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'activity':
        router.push(`/activities`);
        break;
      case 'project':
        router.push(`/projects`);
        break;
      case 'user':
        if (currentUser?.roles.includes('admin')) {
          router.push(`/admin/users`);
        }
        break;
      case 'subject_area':
        if (currentUser?.roles.includes('admin') || currentUser?.roles.includes('subject_area_leader')) {
          router.push(`/admin/subject-areas`);
        }
        break;
    }
  };

  if (loading) {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Søk</h1>
          <p className="text-gray-600 mt-1">Søk på tvers av aktiviteter, prosjekter, brukere og emneområder</p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Søk</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-query">Søkeord</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-query"
                    placeholder="Søk i alt innhold..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-type">Type</Label>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle typer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle typer</SelectItem>
                    <SelectItem value="activity">Aktiviteter</SelectItem>
                    <SelectItem value="project">Prosjekter</SelectItem>
                    <SelectItem value="user">Brukere</SelectItem>
                    <SelectItem value="subject_area">Emneområder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-filter">Organisasjon</Label>
                <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle organisasjoner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle organisasjoner</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.name}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-filter">Tidsperiode</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All tid" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tid</SelectItem>
                    <SelectItem value="this_month">Denne måneden</SelectItem>
                    <SelectItem value="last_month">Forrige måned</SelectItem>
                    <SelectItem value="this_year">Dette året</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search Results */}
        {searchQuery && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Søkeresultater ({searchResults.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSearchType('all');
                  setOrganizationFilter('all');
                  setDateFilter('all');
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Nullstill filtre
              </Button>
            </div>

            {searchResults.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen resultater</h3>
                  <p className="text-gray-600">
                    Ingen treff for "{searchQuery}". Prøv med andre søkeord eller juster filtrene.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <Card key={`${result.type}-${result.id}`} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getTypeIcon(result.type)}
                            <Badge variant="secondary">{getTypeLabel(result.type)}</Badge>
                            {result.metadata.organization && (
                              <Badge variant="outline" className="flex items-center space-x-1">
                                <Building className="h-3 w-3" />
                                <span>{result.metadata.organization}</span>
                              </Badge>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {result.title}
                          </h3>
                          
                          {result.description && (
                            <p className="text-gray-600 mb-3 line-clamp-2">
                              {result.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            {/* Activity-specific metadata */}
                            {result.type === 'activity' && (
                              <>
                                {result.metadata.date && (
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(new Date(result.metadata.date), 'd. MMMM yyyy', { locale: nb })}</span>
                                  </div>
                                )}
                                {result.metadata.location && (
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{result.metadata.location}</span>
                                  </div>
                                )}
                                {result.metadata.creator && (
                                  <div className="flex items-center space-x-1">
                                    <User className="h-4 w-4" />
                                    <span>{result.metadata.creator}</span>
                                  </div>
                                )}
                                {result.metadata.link && (
                                  <a
                                    href={result.metadata.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-1 text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    <span>Lenke</span>
                                  </a>
                                )}
                              </>
                            )}

                            {/* Project-specific metadata */}
                            {result.type === 'project' && (
                              <>
                                {result.metadata.status && (
                                  <Badge variant="outline">{result.metadata.status}</Badge>
                                )}
                                {result.metadata.fundingSource && (
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="h-4 w-4" />
                                    <span>{result.metadata.fundingSource}</span>
                                  </div>
                                )}
                                {result.metadata.fundSum && (
                                  <span>{result.metadata.fundSum.toLocaleString('nb-NO')} kr</span>
                                )}
                                {result.metadata.geographicArea && (
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{result.metadata.geographicArea}</span>
                                  </div>
                                )}
                                {result.metadata.leader && (
                                  <div className="flex items-center space-x-1">
                                    <Users className="h-4 w-4" />
                                    <span>{result.metadata.leader}</span>
                                  </div>
                                )}
                              </>
                            )}

                            {/* User-specific metadata */}
                            {result.type === 'user' && (
                              <>
                                <span>{result.metadata.email}</span>
                                {result.metadata.title && <span>{result.metadata.title}</span>}
                                {result.metadata.roles && result.metadata.roles.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {result.metadata.roles.map((role: string, index: number) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {role}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}

                            {/* Subject area-specific metadata */}
                            {result.type === 'subject_area' && (
                              <>
                                {result.metadata.leader && (
                                  <div className="flex items-center space-x-1">
                                    <Users className="h-4 w-4" />
                                    <span>Leder: {result.metadata.leader}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {!searchQuery && (
          <Card>
            <CardContent className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Søk i DriftRapport</h3>
              <p className="text-gray-600 mb-4">
                Bruk søkefeltet over for å finne aktiviteter, prosjekter, brukere og emneområder.
              </p>
              <div className="text-sm text-gray-500">
                <p>Tips for søk:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Bruk nøkkelord fra tittel, beskrivelse eller navn</li>
                  <li>• Filtrer etter type, organisasjon eller tidsperiode</li>
                  <li>• Søk er case-insensitivt</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
