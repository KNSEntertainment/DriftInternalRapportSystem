"use server";

import { supabaseAdmin } from "./supabase-admin";
import { Role } from "@/types/database";
import type { AuthUser } from "./auth";

function getPermissionsForRoles(roles: Role[]): string[] {
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

export async function getAuthUserProfile(userId: string, email: string): Promise<AuthUser> {
	const { data: profileData, error: profileError } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
	const profile = profileData as any;

	if (profileError || !profile) {
		return {
			id: userId,
			email,
			fullName: email.split("@")[0],
			roles: [],
			organizationId: "",
			permissions: [],
		};
	}

	const { data: userRolesData, error: rolesError } = await supabaseAdmin.from("user_roles").select("role, organization_id").eq("user_id", userId);
	const userRoles = userRolesData as any[];

	if (rolesError) {
		throw new Error(rolesError.message);
	}

	const roles = (userRoles || []).map((userRole) => userRole.role as Role);

	return {
		id: userId,
		email,
		fullName: profile.full_name,
		roles,
		organizationId: profile.organization_id,
		permissions: getPermissionsForRoles(roles),
	};
}
