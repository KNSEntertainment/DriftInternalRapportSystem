'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { getAuditLogs, getAuditStatistics, AuditAction } from '@/lib/audit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Filter, Calendar, User, FileText, Settings, Download, Eye, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface AuditLog {
  id: string;
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  timestamp: string;
  ip_address?: string;
  users?: {
    full_name: string;
    email: string;
  };
}

export default function AuditLogsPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('month');
  const [limit, setLimit] = useState<number>(100);

  useEffect(() => {
    if (!loading && (!currentUser || !currentUser.roles.includes('admin'))) {
      router.push('/dashboard');
      return;
    }

    if (currentUser && currentUser.roles.includes('admin')) {
      fetchAuditLogs();
      fetchStatistics();
    }
  }, [currentUser, loading, router, actionFilter, entityTypeFilter, timeframe, limit]);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      const data = await getAuditLogs(
        entityTypeFilter !== 'all' ? entityTypeFilter : undefined,
        undefined,
        undefined,
        limit
      );
      
      // Apply client-side filtering
      let filteredLogs = data;
      
      if (actionFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.action === actionFilter);
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.users?.full_name.toLowerCase().includes(query) ||
          log.users?.email.toLowerCase().includes(query) ||
          log.entity_type.toLowerCase().includes(query) ||
          log.entity_id.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query)
        );
      }
      
      setLogs(filteredLogs);
    } catch (err) {
      setError('Kunne ikke hente audit logger');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await getAuditStatistics(timeframe as any);
      setStatistics(stats);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  const getActionLabel = (action: AuditAction) => {
    switch (action) {
      case 'create': return 'Opprettet';
      case 'update': return 'Oppdatert';
      case 'delete': return 'Slettet';
      case 'approve': return 'Godkjent';
      case 'export': return 'Eksportert';
      case 'role_change': return 'Rolle-endring';
      case 'login': return 'Innlogging';
      case 'logout': return 'Utlogging';
      default: return action;
    }
  };

  const getActionColor = (action: AuditAction) => {
    switch (action) {
      case 'create': return 'bg-green-100 text-green-800';
      case 'update': return 'bg-blue-100 text-blue-800';
      case 'delete': return 'bg-red-100 text-red-800';
      case 'approve': return 'bg-green-100 text-green-800';
      case 'export': return 'bg-purple-100 text-purple-800';
      case 'role_change': return 'bg-orange-100 text-orange-800';
      case 'login': return 'bg-gray-100 text-gray-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'user': return 'Bruker';
      case 'project': return 'Prosjekt';
      case 'activity': return 'Aktivitet';
      case 'subject_area': return 'Emneområde';
      case 'report': return 'Rapport';
      case 'session': return 'Sesjon';
      default: return entityType;
    }
  };

  const formatAuditValues = (values: Record<string, any>) => {
    if (!values) return 'Ingen data';
    
    try {
      const formatted = Object.entries(values)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          if (typeof value === 'object') {
            return `${key}: ${JSON.stringify(value, null, 2)}`;
          }
          return `${key}: ${value}`;
        })
        .join('\n');
      
      return formatted || 'Ingen data';
    } catch (err) {
      return 'Kunne ikke formatere data';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!currentUser || !currentUser.roles.includes('admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className='container py-8'>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Audit Logger</h1>
          <p className="text-gray-600 mt-1">Sikkerhetslogg og sporing av systemhandlinger</p>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Totalt Handlinger</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total}</div>
                <p className="text-xs text-muted-foreground">Siste {timeframe}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Opprettelser</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.byAction.create || 0}</div>
                <p className="text-xs text-muted-foreground">Nye enheter</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Oppdateringer</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.byAction.update || 0}</div>
                <p className="text-xs text-muted-foreground">Endringer</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eksporter</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.byAction.export || 0}</div>
                <p className="text-xs text-muted-foreground">Rapporter</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filtre</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-query">Søk</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-query"
                    placeholder="Søk i logger..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action-filter">Handling</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle handlinger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle handlinger</SelectItem>
                    <SelectItem value="create">Opprett</SelectItem>
                    <SelectItem value="update">Oppdater</SelectItem>
                    <SelectItem value="delete">Slett</SelectItem>
                    <SelectItem value="approve">Godkjenn</SelectItem>
                    <SelectItem value="export">Eksporter</SelectItem>
                    <SelectItem value="role_change">Rolle-endring</SelectItem>
                    <SelectItem value="login">Innlogging</SelectItem>
                    <SelectItem value="logout">Utlogging</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-filter">Entitet</Label>
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle entiteter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle entiteter</SelectItem>
                    <SelectItem value="user">Bruker</SelectItem>
                    <SelectItem value="project">Prosjekt</SelectItem>
                    <SelectItem value="activity">Aktivitet</SelectItem>
                    <SelectItem value="subject_area">Emneområde</SelectItem>
                    <SelectItem value="report">Rapport</SelectItem>
                    <SelectItem value="session">Sesjon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeframe">Tidsperiode</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Siste dag</SelectItem>
                    <SelectItem value="week">Siste uke</SelectItem>
                    <SelectItem value="month">Siste måned</SelectItem>
                    <SelectItem value="year">Siste år</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="limit">Antall</Label>
                <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Antall resultater" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
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

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Logger</CardTitle>
            <CardDescription>
              Viser {logs.length} av {statistics?.total || 0} logger
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Ingen logger funnet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tidspunkt</TableHead>
                      <TableHead>Bruker</TableHead>
                      <TableHead>Handling</TableHead>
                      <TableHead>Entitet</TableHead>
                      <TableHead>Entitet-ID</TableHead>
                      <TableHead>IP-adresse</TableHead>
                      <TableHead>Detaljer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">
                              {format(new Date(log.timestamp), 'd. MMM yyyy HH:mm:ss', { locale: nb })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.users?.full_name || 'Ukjent'}</div>
                            <div className="text-sm text-gray-500">{log.users?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {getActionLabel(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getEntityTypeLabel(log.entity_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.entity_id}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ip_address || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {log.old_values && (
                              <div className="text-xs">
                                <span className="font-medium text-red-600">Før:</span>
                                <pre className="mt-1 p-1 bg-red-50 rounded text-xs max-w-xs overflow-hidden">
                                  {formatAuditValues(log.old_values)}
                                </pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div className="text-xs">
                                <span className="font-medium text-green-600">Etter:</span>
                                <pre className="mt-1 p-1 bg-green-50 rounded text-xs max-w-xs overflow-hidden">
                                  {formatAuditValues(log.new_values)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
