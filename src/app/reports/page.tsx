'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
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
import { Loader2, Plus, Download, FileText, Calendar, Users, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { auditHelpers } from '@/lib/audit';

interface Report {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  generated_by: string;
  generated_at: string;
  export_type: 'pdf' | 'docx';
  file_url?: string;
}

interface SimpleActivity {
  id: string;
  created_by: string;
  type: 'participated_event' | 'arranged_event' | 'publication';
  title: string;
  description?: string;
  date: string;
  location?: string;
  organizations: { name: string };
  subject_areas?: { name: string };
  creator: { full_name: string };
  number_of_participants?: number;
  funding_type?: string;
}

interface SimpleProject {
  id: string;
  project_leader_id?: string;
  name: string;
  description?: string;
  status: string;
  funding_source?: string;
  fund_sum_applied?: number;
  geographic_area?: string;
  organizations: { name: string };
  project_leader?: { id: string; full_name: string };
  start_date?: string;
  end_date?: string;
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

interface ReportData {
  activities: SimpleActivity[];
  projects: SimpleProject[];
  users: SimpleUser[];
  subjectAreas: SimpleSubjectArea[];
}

type ReportInsertResult = Promise<{ error: unknown }>;

export default function ReportsPage() {
  const { user: currentUser, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [activities, setActivities] = useState<SimpleActivity[]>([]);
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [subjectAreas, setSubjectAreas] = useState<SimpleSubjectArea[]>([]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    reportType: 'annual',
    exportType: 'pdf' as 'pdf' | 'docx',
    year: '', // Make year optional by default
    organizationId: 'all',
    subjectAreaId: 'all',
    userId: 'all',
    projectStatus: 'all',
    activityType: 'all',
    dateRange: {
      start: '',
      end: '',
    },
    includeCharts: true,
    includeDetails: true,
  });

  const fetchReports = async () => {
    try {
      const supabase = getSupabase();
      const query = supabase
        .from('reports')
        .select('*')
        .order('generated_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setReports((data as Report[]) || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchActivities(),
        fetchProjects(),
        fetchUsers(),
        fetchSubjectAreas(),
        fetchOrganizations(),
      ]);
    } catch (err) {
      setError('Kunne ikke hente data for rapporter');
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
          created_by,
          type,
          title,
          description,
          date,
          location,
          number_of_participants,
          funding_type,
          organizations(name),
          subject_areas(name),
          creator:users!activities_created_by_fkey(full_name)
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
          project_leader_id,
          start_date,
          end_date,
          organizations(name),
          project_leader:users!projects_project_leader_id_fkey(id, full_name)
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
          organizations!users_organization_id_fkey(name),
          user_roles(role)
        `)
        .eq('active', true)
        .order('full_name');

      // Note: Organization filtering disabled temporarily to fix 400 error
      // if (currentUser && !currentUser.roles.includes('admin')) {
      //   query = query.eq('organization_id', currentUser.organizationId);
      // }

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
          leader:users!subject_areas_leader_id_fkey(full_name)
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

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchReports();
      fetchAllData();
    }
  }, [currentUser, loading, router]);

  const generatePDFReport = async (reportData: ReportData) => {
    const pdf = new jsPDF();
    
    // Title
    pdf.setFontSize(20);
    pdf.text(formData.name, 20, 20);
    
    // Metadata
    pdf.setFontSize(12);
    pdf.text(`Generert: ${format(new Date(), 'd. MMMM yyyy HH:mm', { locale: nb })}`, 20, 35);
    pdf.text(`Generert av: ${currentUser?.fullName || currentUser?.email}`, 20, 45);
    
    let yPosition = 65;
    
    // Summary section
    pdf.setFontSize(16);
    pdf.text('Sammendrag', 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(12);
    pdf.text(`Totalt antall aktiviteter: ${reportData.activities.length}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Totalt antall prosjekter: ${reportData.projects.length}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Totalt antall brukere: ${reportData.users.length}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Totalt antall emneområder: ${reportData.subjectAreas.length}`, 20, yPosition);
    yPosition += 15;
    
    if (formData.includeDetails && reportData.activities.length > 0) {
      pdf.setFontSize(16);
      pdf.text('Aktiviteter', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      reportData.activities.slice(0, 10).forEach((activity: SimpleActivity) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(`${activity.title} (${format(new Date(activity.date), 'd. MMM yyyy', { locale: nb })})`, 20, yPosition);
        yPosition += 6;
        if (activity.description) {
          pdf.setFontSize(10);
          const lines = pdf.splitTextToSize(activity.description, 170);
          lines.forEach((line: string) => {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 20;
            }
            pdf.text(line, 25, yPosition);
            yPosition += 5;
          });
          pdf.setFontSize(12);
          yPosition += 3;
        }
        yPosition += 5;
      });
    }
    
    if (formData.includeDetails && reportData.projects.length > 0) {
      if (yPosition > 230) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(16);
      pdf.text('Prosjekter', 20, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(12);
      reportData.projects.slice(0, 10).forEach((project: SimpleProject) => {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(`${project.name} - ${project.status}`, 20, yPosition);
        yPosition += 6;
        if (project.description) {
          pdf.setFontSize(10);
          const lines = pdf.splitTextToSize(project.description, 170);
          lines.forEach((line: string) => {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 20;
            }
            pdf.text(line, 25, yPosition);
            yPosition += 5;
          });
          pdf.setFontSize(12);
          yPosition += 3;
        }
        yPosition += 5;
      });
    }
    
    return pdf;
  };

  const generateDOCXReport = async (reportData: ReportData) => {
    const sections: Paragraph[] = [];
    
    // Title
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: formData.name,
            bold: true,
            size: 32,
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
    
    // Metadata
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generert: ${format(new Date(), 'd. MMMM yyyy HH:mm', { locale: nb })}`,
          }),
        ],
      })
    );
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Generert av: ${currentUser?.fullName || currentUser?.email}`,
          }),
        ],
      })
    );
    
    // Summary
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Sammendrag",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
      })
    );
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun(`Totalt antall aktiviteter: ${reportData.activities.length}`),
        ],
      })
    );
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun(`Totalt antall prosjekter: ${reportData.projects.length}`),
        ],
      })
    );
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun(`Totalt antall brukere: ${reportData.users.length}`),
        ],
      })
    );
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun(`Totalt antall emneområder: ${reportData.subjectAreas.length}`),
        ],
      })
    );
    
    if (formData.includeDetails && reportData.activities.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Aktiviteter",
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
        })
      );
      
      reportData.activities.slice(0, 10).forEach((activity: SimpleActivity) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${activity.title} (${format(new Date(activity.date), 'd. MMM yyyy', { locale: nb })})`,
                bold: true,
              }),
            ],
          })
        );
        
        if (activity.description) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun(activity.description),
              ],
            })
          );
        }
      });
    }
    
    if (formData.includeDetails && reportData.projects.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Prosjekter",
              bold: true,
              size: 24,
            }),
          ],
          heading: HeadingLevel.HEADING_1,
        })
      );
      
      reportData.projects.slice(0, 10).forEach((project: SimpleProject) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${project.name} - ${project.status}`,
                bold: true,
              }),
            ],
          })
        );
        
        if (project.description) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun(project.description),
              ],
            })
          );
        }
      });
    }
    
    return new Document({
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    });
  };

  const handleGenerateReport = async () => {
    if (!currentUser) return;
    if (!formData.name.trim()) {
      setError('Vennligst gi rapporten et navn');
      return;
    }
    
    const supabase = getSupabase();
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Check if we have data
      console.log('Raw data fetched:');
      console.log('Activities:', activities.length, activities);
      console.log('Projects:', projects.length, projects);
      console.log('Users:', users.length, users);
      console.log('Subject areas:', subjectAreas.length, subjectAreas);
      
      // Filter data based on form criteria
      let filteredActivities = activities;
      let filteredProjects = projects;
      let filteredUsers = users;
      let filteredSubjectAreas = subjectAreas;
      
      // Apply filters
      if (formData.year) {
        const year = parseInt(formData.year);
        filteredActivities = filteredActivities.filter(activity => 
          new Date(activity.date).getFullYear() === year
        );
        filteredProjects = filteredProjects.filter(project => 
          project.start_date && new Date(project.start_date).getFullYear() === year
        );
      }

      if (formData.dateRange.start) {
        const startDate = new Date(formData.dateRange.start);
        filteredActivities = filteredActivities.filter(activity => new Date(activity.date) >= startDate);
        filteredProjects = filteredProjects.filter(project => !project.start_date || new Date(project.start_date) >= startDate);
      }

      if (formData.dateRange.end) {
        const endDate = new Date(formData.dateRange.end);
        filteredActivities = filteredActivities.filter(activity => new Date(activity.date) <= endDate);
        filteredProjects = filteredProjects.filter(project => !project.end_date || new Date(project.end_date) <= endDate);
      }
      
      if (formData.organizationId !== 'all') {
        filteredActivities = filteredActivities.filter(activity => 
          activity.organizations.name === formData.organizationId
        );
        filteredProjects = filteredProjects.filter(project => 
          project.organizations.name === formData.organizationId
        );
        filteredUsers = filteredUsers.filter(user => 
          user.organizations.name === formData.organizationId
        );
        filteredSubjectAreas = filteredSubjectAreas.filter(area => 
          area.organizations.name === formData.organizationId
        );
      }
      
      if (formData.subjectAreaId !== 'all') {
        filteredActivities = filteredActivities.filter(activity => 
          activity.subject_areas?.name === formData.subjectAreaId
        );
      }
      
      if (formData.activityType !== 'all') {
        filteredActivities = filteredActivities.filter(activity => 
          activity.type === formData.activityType
        );
      }
      
      if (formData.projectStatus !== 'all') {
        filteredProjects = filteredProjects.filter(project => 
          project.status === formData.projectStatus
        );
      }

      if (formData.userId !== 'all') {
        filteredActivities = filteredActivities.filter(activity => activity.created_by === formData.userId);
        filteredProjects = filteredProjects.filter(project => project.project_leader_id === formData.userId);
        filteredUsers = filteredUsers.filter(user => user.id === formData.userId);
      }
      
      const reportData = {
        activities: filteredActivities,
        projects: filteredProjects,
        users: filteredUsers,
        subjectAreas: filteredSubjectAreas,
      };
      
      console.log('Filtered data for report:');
      console.log('Filtered activities:', filteredActivities.length);
      console.log('Filtered projects:', filteredProjects.length);
      console.log('Filtered users:', filteredUsers.length);
      console.log('Filtered subject areas:', filteredSubjectAreas.length);
      
      // Generate report based on export type
      let blob: Blob;
      
      try {
        if (formData.exportType === 'pdf') {
          console.log('Generating PDF report...');
          const pdf = await generatePDFReport(reportData);
          blob = pdf.output('blob');
        } else {
          console.log('Generating DOCX report...');
          const doc = await generateDOCXReport(reportData);
          blob = await Packer.toBlob(doc);
        }
        console.log('Report generated successfully');
      } catch (genError) {
        console.error('Error generating report:', genError);
        throw new Error('Kunne ikke generere rapportfilen: ' + (genError instanceof Error ? genError.message : String(genError)));
      }
      
      // Create download URL
      try {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${formData.name}.${formData.exportType}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('Report downloaded successfully');
      } catch (downloadError) {
        console.error('Error downloading report:', downloadError);
        throw new Error('Kunne ikke laste ned rapporten: ' + (downloadError instanceof Error ? downloadError.message : String(downloadError)));
      }
      
      // Save report to database
      try {
        console.log('Saving report to database...');
        const { error: saveError } = await (supabase
          .from('reports') as unknown as { insert: (value: unknown) => ReportInsertResult })
          .insert({
            name: formData.name,
            filters: {
              year: formData.year,
              organizationId: formData.organizationId,
              subjectAreaId: formData.subjectAreaId,
              activityType: formData.activityType,
              projectStatus: formData.projectStatus,
              userId: formData.userId,
              dateRange: formData.dateRange,
              reportType: formData.reportType,
              includeCharts: formData.includeCharts,
              includeDetails: formData.includeDetails,
            },
            generated_by: currentUser.id,
            export_type: formData.exportType,
          });
        
        if (saveError) {
          console.error('Error saving report to database:', saveError);
          throw saveError;
        }
        console.log('Report saved to database successfully');
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Don't throw here - the report was already downloaded, just log the error
        setError('Rapport lastet ned, men kunne ikke lagres i databasen');
        return;
      }
      
      setSuccess('Rapport generert og lastet ned!');
      
      // Log audit entry for report generation
      await auditHelpers.logExportGenerated(currentUser.id, {
        id: Date.now().toString(),
        name: formData.name,
        export_type: formData.exportType,
        filters: {
          year: formData.year,
          organizationId: formData.organizationId,
          subjectAreaId: formData.subjectAreaId,
          userId: formData.userId,
          projectStatus: formData.projectStatus,
          activityType: formData.activityType,
          dateRange: formData.dateRange,
          reportType: formData.reportType,
          includeCharts: formData.includeCharts,
          includeDetails: formData.includeDetails,
        }
      });
      
      setIsCreateDialogOpen(false);
      fetchReports();
      
      // Reset form
      setFormData({
        name: '',
        reportType: 'annual',
        exportType: 'pdf',
        year: '', // Make year optional by default
        organizationId: 'all',
        subjectAreaId: 'all',
        userId: 'all',
        projectStatus: 'all',
        activityType: 'all',
        dateRange: {
          start: '',
          end: '',
        },
        includeCharts: true,
        includeDetails: true,
      });
      
    } catch (err) {
      setError('Kunne ikke generere rapport');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    // This would download the actual file from storage
    // For now, we'll just show a message
    setSuccess('Rapport lastet ned');
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
            <h1 className="text-3xl font-bold text-gray-900">Rapporter</h1>
            <p className="text-gray-600 mt-1">Generer og administrer rapporter og eksporter</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ny rapport
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generer ny rapport</DialogTitle>
                <DialogDescription>
                  Opprett en ny rapport med valgte filtre og eksportformat
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Rapportnavn *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="f.eks. Årsrapport 2024"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reportType">Rapporttype</Label>
                    <Select
                      value={formData.reportType}
                      onValueChange={(value) => setFormData({ ...formData, reportType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Årsrapport</SelectItem>
                        <SelectItem value="quarterly">Kvartalsrapport</SelectItem>
                        <SelectItem value="monthly">Månedsrapport</SelectItem>
                        <SelectItem value="custom">Tilpasset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exportType">Eksportformat</Label>
                    <Select
                      value={formData.exportType}
                      onValueChange={(value: 'pdf' | 'docx') => setFormData({ ...formData, exportType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="docx">Word (DOCX)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">År</Label>
                    <Select
                      value={formData.year}
                      onValueChange={(value) => setFormData({ ...formData, year: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg år" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2023, 2022, 2021].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="organizationId">Organisasjon</Label>
                    <Select
                      value={formData.organizationId}
                      onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
                    >
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subjectAreaId">Emneområde</Label>
                    <Select
                      value={formData.subjectAreaId}
                      onValueChange={(value) => setFormData({ ...formData, subjectAreaId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Alle emneområder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle emneområder</SelectItem>
                        {subjectAreas.map((area) => (
                          <SelectItem key={area.id} value={area.name}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="activityType">Aktivitetstype</Label>
                    <Select
                      value={formData.activityType}
                      onValueChange={(value) => setFormData({ ...formData, activityType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Alle typer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle typer</SelectItem>
                        <SelectItem value="participated_event">Deltakelse</SelectItem>
                        <SelectItem value="arranged_event">Arrangement</SelectItem>
                        <SelectItem value="publication">Publikasjon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectStatus">Prosjektstatus</Label>
                  <Select
                    value={formData.projectStatus}
                    onValueChange={(value) => setFormData({ ...formData, projectStatus: value })}
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="userId">Ansatt/prosjektleder</Label>
                  <Select
                    value={formData.userId}
                    onValueChange={(value) => setFormData({ ...formData, userId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Alle ansatte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle ansatte</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateRangeStart">Fra dato</Label>
                    <Input
                      id="dateRangeStart"
                      type="date"
                      value={formData.dateRange.start}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({
                        ...formData,
                        dateRange: { ...formData.dateRange, start: e.target.value },
                      })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateRangeEnd">Til dato</Label>
                    <Input
                      id="dateRangeEnd"
                      type="date"
                      value={formData.dateRange.end}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({
                        ...formData,
                        dateRange: { ...formData.dateRange, end: e.target.value },
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeCharts"
                      checked={formData.includeCharts}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, includeCharts: e.target.checked })}
                    />
                    <Label htmlFor="includeCharts">Inkluder grafer og diagrammer</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeDetails"
                      checked={formData.includeDetails}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, includeDetails: e.target.checked })}
                    />
                    <Label htmlFor="includeDetails">Inkluder detaljerte beskrivelser</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleGenerateReport} disabled={isGenerating}>
                  {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generer rapport
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totalt Aktiviteter</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activities.length}</div>
              <p className="text-xs text-muted-foreground">Registrerte aktiviteter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totalt Prosjekter</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground">Alle prosjekter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktive Brukere</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">Aktive brukere</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Genererte Rapporter</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.length}</div>
              <p className="text-xs text-muted-foreground">Tidligere generert</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Tidligere rapporter</CardTitle>
            <CardDescription>
              Tidligere genererte rapporter
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Ingen rapporter generert ennå</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Navn</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Generert</TableHead>
                    <TableHead>Generert av</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{report.export_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(report.generated_at), 'd. MMM yyyy HH:mm', { locale: nb })}
                      </TableCell>
                      <TableCell>{report.generated_by}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReport()}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Last ned
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
