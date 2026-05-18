#!/usr/bin/env node

/**
 * Setup script to create the first admin user
 * Run with: node scripts/create-first-admin.mjs
 */

import { createClient } from "@supabase/supabase-js";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", ".env.local");

if (fs.existsSync(envPath)) {
	const envContent = fs.readFileSync(envPath, "utf-8");
	envContent.split("\n").forEach((line) => {
		const match = line.match(/^([^=]+)=(.*)$/);
		if (match && !line.startsWith("#")) {
			process.env[match[1].trim()] = match[2].trim();
		}
	});
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
	console.error("❌ Missing environment variables:");
	console.error("   - NEXT_PUBLIC_SUPABASE_URL");
	console.error("   - SUPABASE_SERVICE_ROLE_KEY");
	console.error("\nSet these in your .env.local file");
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

function question(prompt) {
	return new Promise((resolve) => rl.question(prompt, resolve));
}

async function createFirstAdmin() {
	console.log("\n🚀 DriftRapport First Admin Setup\n");

	try {
		// Step 1: Get organization
		console.log("📋 Checking organizations...");
		const { data: orgs, error: orgsError } = await supabase.from("organizations").select("*");

		if (orgsError) throw orgsError;

		let organizationId;

		if (orgs && orgs.length > 0) {
			console.log("\nAvailable organizations:");
			orgs.forEach((org, i) => {
				console.log(`  ${i + 1}. ${org.name} (${org.id})`);
			});

			const choice = await question("\nSelect organization number (1-" + orgs.length + "): ");
			organizationId = orgs[parseInt(choice) - 1]?.id;

			if (!organizationId) {
				console.error("❌ Invalid organization selection");
				process.exit(1);
			}
		} else {
			console.log("❌ No organizations found. Creating one...");
			const orgName = await question("Organization name: ");
			const { data: newOrg, error: createOrgError } = await supabase.from("organizations").insert({ name: orgName }).select().single();

			if (createOrgError) throw createOrgError;
			organizationId = newOrg.id;
			console.log(`✅ Created organization: ${orgName}`);
		}

		// Step 2: Get user details
		console.log("\n👤 Admin User Details:");
		const fullName = await question("Full name: ");
		const email = await question("Email: ");
		const password = await question("Password (min 6 chars): ");

		if (password.length < 6) {
			console.error("❌ Password must be at least 6 characters");
			process.exit(1);
		}

		// Step 3: Create auth user
		console.log("\n🔐 Creating auth account...");
		const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
		});

		if (authError) throw authError;
		if (!authUser.user) throw new Error("Failed to create auth user");

		console.log(`✅ Auth account created: ${authUser.user.id}`);

		// Step 4: Create user profile
		console.log("📝 Creating user profile...");
		const { error: userError } = await supabase.from("users").insert({
			id: authUser.user.id,
			full_name: fullName,
			email,
			organization_id: organizationId,
			active: true,
		});

		if (userError) throw userError;
		console.log("✅ User profile created");

		// Step 5: Assign admin role
		console.log("👑 Assigning admin role...");
		const { error: roleError } = await supabase.from("user_roles").insert({
			user_id: authUser.user.id,
			role: "admin",
			organization_id: organizationId,
		});

		if (roleError) throw roleError;
		console.log("✅ Admin role assigned");

		// Success
		console.log("\n✨ Setup Complete!\n");
		console.log("You can now login with:");
		console.log(`  Email: ${email}`);
		console.log(`  Password: ${password}\n`);
		console.log("🔗 Login at: http://localhost:3000/login\n");

		rl.close();
	} catch (error) {
		console.error("❌ Error:", error.message);
		rl.close();
		process.exit(1);
	}
}

createFirstAdmin();
