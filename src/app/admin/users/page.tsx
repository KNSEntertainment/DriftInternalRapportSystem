"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";
import { createUser } from "@/lib/admin-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Edit, Trash2, User, Mail, Phone, Building } from "lucide-react";
import { auditHelpers } from "@/lib/audit";

interface SimpleUser {
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
}

interface SimpleUserRole {
	user_id: string;
	role: string;
	organization_id: string;
	created_at: string;
}

interface SimpleOrganization {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
}

interface UserWithRoles extends SimpleUser {
	user_roles: SimpleUserRole[];
	organizations: SimpleOrganization;
}

export default function SimpleUsersPage() {
	const { user: currentUser, loading } = useAuth();
	const router = useRouter();
	const [users, setUsers] = useState<UserWithRoles[]>([]);
	const [organizations, setOrganizations] = useState<SimpleOrganization[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

	// Form state
	const [formData, setFormData] = useState({
		full_name: "",
		email: "",
		password: "",
		phone: "",
		title: "",
		work_percentage: "",
		employment_type: "",
		start_date: "",
		end_date: "",
		remarks: "",
		organization_id: "",
		active: true,
		roles: [] as string[],
	});

	useEffect(() => {
		if (!loading) {
			// If no user at all, proxy will redirect to /login
			if (!currentUser) {
				router.push("/login");
				return;
			}
			// If user exists but is not admin, redirect to dashboard
			if (!currentUser.roles.includes("admin")) {
				router.push("/dashboard");
				return;
			}
			// User is admin, load data
			fetchUsers();
			fetchOrganizations();
		}
	}, [currentUser, loading, router]);

	const fetchUsers = async () => {
		try {
			const supabase = getSupabase();
			const { data, error } = await supabase.from("users").select(`
          *,
          user_roles(*),
          organizations!users_organization_id_fkey(*)
        `);

			if (error) throw error;
			setUsers((data as UserWithRoles[]) || []);
		} catch (err) {
			setError("Kunne ikke hente brukere");
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchOrganizations = async () => {
		try {
			const supabase = getSupabase();
			const { data, error } = await supabase.from("organizations").select("*");

			if (error) throw error;
			setOrganizations((data as SimpleOrganization[]) || []);
		} catch (err) {
			console.error("Error fetching organizations:", err);
		}
	};

	const handleCreateUser = async () => {
		try {
			setError(null);

			// Validate required fields
			if (!formData.full_name || !formData.email || !formData.password || !formData.organization_id) {
				setError("Vennligst fyll inn alle påkrevde felt (navn, e-post, passord, organisasjon)");
				return;
			}

			// Call server action to create user with auth account
			const result = await createUser(formData.email, formData.password, formData.full_name, formData.organization_id, formData.roles.length > 0 ? formData.roles : ["employee"], {
				phone: formData.phone || undefined,
				title: formData.title || undefined,
				workPercentage: formData.work_percentage ? parseInt(formData.work_percentage) : undefined,
				employmentType: formData.employment_type || undefined,
				startDate: formData.start_date || undefined,
				endDate: formData.end_date || undefined,
				remarks: formData.remarks || undefined,
			});

			if (!result.success) {
				setError(result.error || "Kunne ikke opprette bruker");
				return;
			}

			// Log audit entry for user creation
			const newUser = {
				id: result.userId || 'unknown',
				full_name: formData.full_name,
				email: formData.email,
				phone: formData.phone,
				title: formData.title,
				work_percentage: formData.work_percentage ? parseInt(formData.work_percentage) : undefined,
				employment_type: formData.employment_type,
				start_date: formData.start_date,
				organization_id: formData.organization_id,
				roles: formData.roles.length > 0 ? formData.roles : ["employee"]
			};
			await auditHelpers.logUserCreated(currentUser?.id || 'system', newUser);

			// Reset form and refresh
			setFormData({
				full_name: "",
				email: "",
				password: "",
				phone: "",
				title: "",
				work_percentage: "",
				employment_type: "",
				start_date: "",
				end_date: "",
				remarks: "",
				organization_id: "",
				active: true,
				roles: [],
			});
			setIsCreateDialogOpen(false);
			fetchUsers();
		} catch (err) {
			setError("Kunne ikke opprette bruker");
			console.error(err);
		}
	};

	const handleEditUser = async () => {
		if (!selectedUser) return;

		const supabase = getSupabase();
		try {
			setError(null);

			// Update user profile
			const { error: userError } = await (supabase
				.from("users") as any)
				.update({
					full_name: formData.full_name,
					email: formData.email,
					phone: formData.phone || null,
					title: formData.title || null,
					work_percentage: formData.work_percentage ? parseInt(formData.work_percentage) : null,
					employment_type: formData.employment_type || null,
					start_date: formData.start_date || null,
					end_date: formData.end_date || null,
					remarks: formData.remarks || null,
					organization_id: formData.organization_id,
					active: formData.active,
				})
				.eq("id", selectedUser.id);

			if (userError) throw userError;

			// Update roles - delete existing and insert new
			await supabase.from("user_roles").delete().eq("user_id", selectedUser.id);

			if (formData.roles.length > 0) {
				const roleInserts = formData.roles.map((role) => ({
					user_id: selectedUser.id,
					role,
					organization_id: formData.organization_id,
				}));

				const { error: roleError } = await (supabase.from("user_roles") as any).insert(roleInserts);

				if (roleError) throw roleError;
			}

			setIsEditDialogOpen(false);
			setSelectedUser(null);
			fetchUsers();
		} catch (err) {
			setError("Kunne ikke oppdatere bruker");
			console.error(err);
		}
	};

	const handleDeleteUser = async (userId: string) => {
		if (!confirm("Er du sikker på at du vil slette denne brukeren?")) return;

		const supabase = getSupabase();
		try {
			setError(null);

			const { error } = await supabase.from("users").delete().eq("id", userId);

			if (error) throw error;

			fetchUsers();
		} catch (err) {
			setError("Kunne ikke slette bruker");
			console.error(err);
		}
	};

	const openEditDialog = (user: UserWithRoles) => {
		setSelectedUser(user);
		setFormData({
			full_name: user.full_name,
			email: user.email,
			phone: user.phone || "",
			title: user.title || "",
			work_percentage: user.work_percentage?.toString() || "",
			employment_type: user.employment_type || "",
			start_date: user.start_date || "",
			end_date: user.end_date || "",
			remarks: user.remarks || "",
			organization_id: user.organization_id,
			active: user.active,
			password: "",
			roles: user.user_roles.map((ur) => ur.role),
		});
		setIsEditDialogOpen(true);
	};

	if (loading || isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!currentUser || !currentUser.roles.includes("admin")) {
		return null;
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container py-8">
			<div className="max-w-7xl mx-auto">
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">Brukere</h1>
						<p className="text-gray-600 mt-1">Administrer systembrukere og roller</p>
					</div>

					<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
						<DialogTrigger asChild>
							<Button>
								<Plus className="h-4 w-4 mr-2" />
								Ny bruker
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle>Opprett ny bruker</DialogTitle>
								<DialogDescription>Legg til en ny bruker i systemet</DialogDescription>
							</DialogHeader>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="full_name">Fullt navn *</Label>
									<Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
								</div>

								<div className="space-y-2">
									<Label htmlFor="email">E-post *</Label>
									<Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
								</div>

								<div className="space-y-2">
									<Label htmlFor="password">Passord *</Label>
									<Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Min. 6 tegn" required />
								</div>

								<div className="space-y-2">
									<Label htmlFor="organization_id">Organisasjon *</Label>
									<Select value={formData.organization_id} onValueChange={(value) => setFormData({ ...formData, organization_id: value })}>
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
									<Label>Roller</Label>
									<div className="grid grid-cols-2 gap-2">
										{["admin", "leder", "nesteder", "kommunikasjonsrådgiver", "regnskap", "subject_area_leader", "employee"].map((role) => (
											<div key={role} className="flex items-center space-x-2">
												<input
													type="checkbox"
													id={`role-${role}`}
													checked={formData.roles.includes(role)}
													onChange={(e) => {
														if (e.target.checked) {
															setFormData({ ...formData, roles: [...formData.roles, role] });
														} else {
															setFormData({ ...formData, roles: formData.roles.filter((r) => r !== role) });
														}
													}}
												/>
												<Label htmlFor={`role-${role}`} className="text-sm">
													{role}
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
								<Button onClick={handleCreateUser}>Opprett bruker</Button>
							</div>
						</DialogContent>
					</Dialog>
				</div>

				{error && (
					<Alert className="mb-6">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Brukerliste</CardTitle>
						<CardDescription>Alle brukere i systemet</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Navn</TableHead>
									<TableHead>E-post</TableHead>
									<TableHead>Organisasjon</TableHead>
									<TableHead>Roller</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Handlinger</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{users.map((user) => (
									<TableRow key={user.id}>
										<TableCell className="font-medium">
											<div className="flex items-center space-x-2">
												<User className="h-4 w-4 text-gray-500" />
												<span>{user.full_name}</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center space-x-2">
												<Mail className="h-4 w-4 text-gray-500" />
												<span>{user.email}</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center space-x-2">
												<Building className="h-4 w-4 text-gray-500" />
												<span>{user.organizations.name}</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{user.user_roles.map((ur: any, index: number) => (
													<Badge key={index} variant="secondary" className="text-xs">
														{ur.role}
													</Badge>
												))}
											</div>
										</TableCell>
										<TableCell>
											<Badge variant={user.active ? "default" : "secondary"}>{user.active ? "Aktiv" : "Inaktiv"}</Badge>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end space-x-2">
												<Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
													<Edit className="h-4 w-4" />
												</Button>
												<Button variant="outline" size="sm" onClick={() => handleDeleteUser(user.id)}>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
			</div>
		</div>
	);
}
