"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { AuthUser } from "@/lib/auth";
import { getAuthUserProfile } from "@/lib/server-auth-actions";

interface AuthContextType {
	user: AuthUser | null;
	supabaseUser: User | null;
	loading: boolean;
	signOut: () => Promise<void>;
	signIn: (email: string, password: string) => Promise<{ error: any }>;
	signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
	resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const loadedProfileUserIdRef = useRef<string | null>(null);

	useEffect(() => {
		const loadUserProfile = async (currentSupabaseUser: User) => {
			setSupabaseUser(currentSupabaseUser);

			if (loadedProfileUserIdRef.current === currentSupabaseUser.id) {
				return;
			}

			loadedProfileUserIdRef.current = currentSupabaseUser.id;
			const authUser = await getAuthUserProfile(currentSupabaseUser.id, currentSupabaseUser.email || "");
			setUser(authUser);
		};

		// Get initial session
		const getInitialSession = async () => {
			try {
				console.log("[AuthContext] Getting initial session...");
				const supabase = getSupabase();
				const {
					data: { session },
				} = await supabase.auth.getSession();

				console.log("[AuthContext] Session:", session?.user?.email);

				if (session?.user) {
					console.log("[AuthContext] Calling getAuthUserProfile...");
					await loadUserProfile(session.user);
				}
			} catch (error) {
				console.error("[AuthContext] Error getting initial session:", error);
			} finally {
				console.log("[AuthContext] Setting loading to false");
				setLoading(false);
			}
		};

		getInitialSession();

		// Listen for auth changes
		const supabase = getSupabase();
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			console.log("[AuthContext] Auth state changed:", event);
			if (session?.user) {
				setSupabaseUser(session.user);
				setLoading(false);
			} else {
				loadedProfileUserIdRef.current = null;
				setSupabaseUser(null);
				setUser(null);
				setLoading(false);
			}
		});

		return () => subscription.unsubscribe();
	}, []);

	const signOut = async () => {
		const supabase = getSupabase();
		await supabase.auth.signOut();
	};

	const signIn = async (email: string, password: string) => {
		const supabase = getSupabase();
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		return { error };
	};

	const signUp = async (email: string, password: string, fullName: string) => {
		const supabase = getSupabase();
		const { error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: fullName,
				},
			},
		});
		return { error };
	};

	const resetPassword = async (email: string) => {
		const supabase = getSupabase();
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`,
		});
		return { error };
	};

	const value = {
		user,
		supabaseUser,
		loading,
		signOut,
		signIn,
		signUp,
		resetPassword,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
