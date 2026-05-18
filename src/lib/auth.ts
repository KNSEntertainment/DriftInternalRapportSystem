import { getSupabase } from "./supabase";
import { Database } from "@/types/database";
import { Role } from "@/types/database";

export interface AuthUser {
	id: string;
	email: string;
	fullName?: string;
	roles: Role[];
	organizationId: string;
	permissions: string[];
}

export async function getCurrentUserFromDatabase(userId: string, email: string): Promise<AuthUser | null> {
	try {
		console.log("[getCurrentUser] START with userId:", userId);
		const supabase = getSupabase();
		console.log("[getCurrentUser] Got supabase client");

		console.log("[getCurrentUser] Fetching profile from database...");

		const queryPromise = supabase.from("users").select("*").eq("id", userId).single();

		const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Database query timeout after 10s")), 10000));

		const { data: profile, error: profileError } = (await Promise.race([queryPromise, timeoutPromise])) as any;

		console.log("[getCurrentUser] Database query completed");
		console.log("[getCurrentUser] Profile error:", profileError);
		console.log("[getCurrentUser] Profile data:", profile);

		if (profileError) {
			console.error("[getCurrentUser] Profile fetch error:", profileError);
			// If user profile doesn't exist, create a minimal one
			if (profileError.code === "PGRST116") {
				console.log("[getCurrentUser] User profile not found, creating default...");
				return {
					id: userId,
					email: email,
					fullName: email.split("@")[0],
					roles: [] as Role[],
					organizationId: "",
					permissions: [],
				};
			}
			return null;
		}

		if (!profile) {
			console.error("[getCurrentUser] No user profile found for:", userId);
			// Return a default user if query succeeded but no profile
			return {
				id: userId,
				email: email,
				fullName: email.split("@")[0],
				roles: [] as Role[],
				organizationId: "",
				permissions: [],
			};
		}

		const profileWithRoles = profile as any;
		const rolesQueryPromise = supabase.from("user_roles").select("role, organization_id").eq("user_id", userId);
		const rolesTimeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Roles query timeout after 10s")), 10000));
		const { data: userRoles, error: rolesError } = (await Promise.race([rolesQueryPromise, rolesTimeoutPromise])) as any;

		if (rolesError) {
			console.error("[getCurrentUser] Roles fetch error:", rolesError);
			return null;
		}

		const roles = (userRoles || []).map((ur: any) => ur.role as Role);
		const permissions = getPermissionsForRoles(roles);

		console.log("[getCurrentUser] SUCCESS:", { id: userId, email, roles });

		return {
			id: userId,
			email: email!,
			fullName: profileWithRoles.full_name,
			roles,
			organizationId: profileWithRoles.organization_id,
			permissions,
		};
	} catch (error) {
		console.error("[getCurrentUser] EXCEPTION:", error);
		// Return a basic user on error to allow app to load
		return {
			id: userId,
			email: email,
			fullName: email.split("@")[0],
			roles: [] as Role[],
			organizationId: "",
			permissions: [],
		};
	}
}

export async function getCurrentUser(): Promise<AuthUser | null> {
	try {
		console.log("[getCurrentUser] START");
		const supabase = getSupabase();
		console.log("[getCurrentUser] Got supabase client");

		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		console.log("[getCurrentUser] Auth user:", user?.id, user?.email);

		if (error || !user) {
			console.error("[getCurrentUser] Auth error:", error);
			return null;
		}

		return getCurrentUserFromDatabase(user.id, user.email || "");
	} catch (error) {
		console.error("[getCurrentUser] EXCEPTION:", error);
		return null;
	}
}

export function getPermissionsForRoles(roles: Role[]): string[] {
	const permissions = new Set<string>();

	roles.forEach((role) => {
		switch (role) {
			case "admin":
				permissions.add("read:all");
				permissions.add("write:all");
				permissions.add("delete:all");
				permissions.add("manage:users");
				permissions.add("manage:roles");
				permissions.add("export:all");
				permissions.add("approve:all");
				break;
			case "leder":
				permissions.add("read:organization");
				permissions.add("write:organization");
				permissions.add("manage:team");
				permissions.add("export:organization");
				permissions.add("approve:activities");
				break;
			case "nesteder":
				permissions.add("read:organization");
				permissions.add("write:organization");
				permissions.add("manage:team");
				permissions.add("export:organization");
				break;
			case "kommunikasjonsrådgiver":
				permissions.add("read:organization");
				permissions.add("write:activities");
				permissions.add("write:publications");
				permissions.add("export:organization");
				break;
			case "regnskap":
				permissions.add("read:organization");
				permissions.add("read:projects");
				permissions.add("write:projects");
				break;
			case "subject_area_leader":
				permissions.add("read:organization");
				permissions.add("write:subject_area");
				permissions.add("manage:subject_area_members");
				permissions.add("export:subject_area");
				break;
			case "employee":
				permissions.add("read:organization");
				permissions.add("write:own_activities");
				permissions.add("read:own_profile");
				permissions.add("write:own_profile");
				break;
		}
	});

	return Array.from(permissions);
}

export function hasPermission(user: AuthUser | null, permission: string): boolean {
	if (!user) return false;
	return user.permissions.includes(permission);
}

export function hasRole(user: AuthUser | null, role: Role): boolean {
	if (!user) return false;
	return user.roles.includes(role);
}

export function canAccessRoute(user: AuthUser | null, route: string): boolean {
	if (!user) return false;

	// Public routes
	if (route === "/login" || route === "/auth/callback") return true;

	// All authenticated users can access dashboard
	if (route === "/dashboard") return true;

	// Admin-only routes
	if (route.startsWith("/admin")) {
		return hasRole(user, "admin");
	}

	// Role-specific routes
	if (route.startsWith("/users") && !hasPermission(user, "manage:users")) {
		return false;
	}

	if (route.startsWith("/reports") && !hasPermission(user, "export:all")) {
		return false;
	}

	return true;
}
