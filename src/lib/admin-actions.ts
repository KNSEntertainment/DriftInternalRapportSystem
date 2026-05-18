"use server";

import { supabaseAdmin } from "./supabase-admin";

interface CreateAdminUserParams {
	email: string;
	password: string;
	fullName: string;
	organizationId: string;
	phone?: string;
	title?: string;
}

interface CreateAdminUserResult {
	success: boolean;
	userId?: string;
	error?: string;
}

/**
 * Create a new admin user with Supabase Auth account and database record
 * This requires the service role key and should only be called by existing admins
 */
export async function createAdminUser(params: CreateAdminUserParams): Promise<CreateAdminUserResult> {
	try {
		// Step 1: Create auth user
		const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email: params.email,
			password: params.password,
			email_confirm: true, // Auto-confirm email
		});

		if (authError) {
			return {
				success: false,
				error: `Auth error: ${authError.message}`,
			};
		}

		if (!authUser.user) {
			return {
				success: false,
				error: "Failed to create auth user",
			};
		}

		// Step 2: Create user record in database
		const { error: userError } = await (supabaseAdmin
			.from("users") as any)
			.insert({
				id: authUser.user.id,
				full_name: params.fullName,
				email: params.email,
				phone: params.phone || null,
				title: params.title || null,
				organization_id: params.organizationId,
				active: true,
			})
			.select()
			.single();

		if (userError) {
			// Clean up: delete the auth user if database creation fails
			await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
			return {
				success: false,
				error: `Database error: ${userError.message}`,
			};
		}

		// Step 3: Assign admin role
		const { error: roleError } = await (supabaseAdmin.from("user_roles") as any).insert({
			user_id: authUser.user.id,
			role: "admin",
			organization_id: params.organizationId,
		});

		if (roleError) {
			// Clean up: delete the auth user and user record if role assignment fails
			await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
			await supabaseAdmin.from("users").delete().eq("id", authUser.user.id);
			return {
				success: false,
				error: `Role assignment error: ${roleError.message}`,
			};
		}

		return {
			success: true,
			userId: authUser.user.id,
		};
	} catch (error) {
		console.error("Error creating admin user:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}

/**
 * Create a regular user (non-admin) with specified roles
 */
export async function createUser(
	email: string,
	password: string,
	fullName: string,
	organizationId: string,
	roles: string[] = ["employee"],
	additionalData?: {
		phone?: string;
		title?: string;
		workPercentage?: number;
		employmentType?: string;
		startDate?: string;
		endDate?: string;
		remarks?: string;
	},
): Promise<CreateAdminUserResult> {
	try {
		// Step 1: Create auth user
		const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
		});

		if (authError) {
			return {
				success: false,
				error: `Auth error: ${authError.message}`,
			};
		}

		if (!authUser.user) {
			return {
				success: false,
				error: "Failed to create auth user",
			};
		}

		// Step 2: Create user record in database
		const { error: userError } = await (supabaseAdmin.from("users") as any).insert({
			id: authUser.user.id,
			full_name: fullName,
			email,
			phone: additionalData?.phone || null,
			title: additionalData?.title || null,
			work_percentage: additionalData?.workPercentage || null,
			employment_type: additionalData?.employmentType || null,
			start_date: additionalData?.startDate || null,
			end_date: additionalData?.endDate || null,
			remarks: additionalData?.remarks || null,
			organization_id: organizationId,
			active: true,
		});

		if (userError) {
			await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
			return {
				success: false,
				error: `Database error: ${userError.message}`,
			};
		}

		// Step 3: Assign roles
		if (roles.length > 0) {
			const roleInserts = roles.map((role) => ({
				user_id: authUser.user.id,
				role,
				organization_id: organizationId,
			}));

			const { error: roleError } = await (supabaseAdmin.from("user_roles") as any).insert(roleInserts);

			if (roleError) {
				await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
				await supabaseAdmin.from("users").delete().eq("id", authUser.user.id);
				return {
					success: false,
					error: `Role assignment error: ${roleError.message}`,
				};
			}
		}

		return {
			success: true,
			userId: authUser.user.id,
		};
	} catch (error) {
		console.error("Error creating user:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}
