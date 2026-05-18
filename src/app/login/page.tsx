"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock } from "lucide-react";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);

	const { signIn, signUp, resetPassword, user, supabaseUser, loading: authLoading } = useAuth();
	const router = useRouter();

	// If already authenticated, redirect to dashboard
	useEffect(() => {
		console.log("[LoginPage] Auth state:", { user: user?.email, supabaseUser: supabaseUser?.email, authLoading });
		if (!authLoading && (user || supabaseUser)) {
			console.log("[LoginPage] User already authenticated, redirecting to dashboard...");
			router.replace("/dashboard");
		}
	}, [user, supabaseUser, authLoading, router]);

	const handleSignIn = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setMessage(null);

		console.log("[LoginPage] Starting sign in...");
		const { error } = await signIn(email, password);

		console.log("[LoginPage] Sign in response, error:", error);

		if (error) {
			setError(error.message);
			setLoading(false);
		} else {
			console.log("[LoginPage] Sign in successful, redirecting to dashboard...");
			router.replace("/dashboard");
			window.location.assign("/dashboard");
			setLoading(false);
		}
	};

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setMessage(null);

		const { error } = await signUp(email, password, email.split("@")[0]);

		if (error) {
			setError(error.message);
		} else {
			setMessage("Registrering vellykket! Vennligst sjekk e-posten din for å bekrefte kontoen.");
		}

		setLoading(false);
	};

	const handlePasswordReset = async () => {
		if (!email) {
			setError("Vennligst skriv inn e-postadressen din først.");
			return;
		}

		setLoading(true);
		setError(null);
		setMessage(null);

		const { error } = await resetPassword(email);

		if (error) {
			setError(error.message);
		} else {
			setMessage("Passord-reset lenke har blitt sendt til e-posten din.");
		}

		setLoading(false);
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					<h1 className="text-3xl font-bold text-gray-900">DriftRapport</h1>
					<p className="mt-2 text-sm text-gray-600">Intern rapporteringsplattform for likestillingssentrene</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Logg inn</CardTitle>
						<CardDescription>Logg inn for å få tilgang til rapporteringssystemet</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						{message && (
							<Alert>
								<AlertDescription>{message}</AlertDescription>
							</Alert>
						)}

						<form onSubmit={handleSignIn} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">E-post</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
									<Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@epost.no" className="pl-10" required disabled={loading} />
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="password">Passord</Label>
								<div className="relative">
									<Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
									<Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" required disabled={loading} />
								</div>
							</div>

							<Button type="submit" disabled={loading} className="w-full">
								{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Logg inn
							</Button>
						</form>

						<div className="text-center">
							<button onClick={handlePasswordReset} className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50" disabled={loading}>
								Glemt passord?
							</button>
						</div>
					</CardContent>
				</Card>

				<div className="text-center text-sm text-gray-500">
					<p>For organisasjoner:</p>
					<p>Likestillingssenteret KUN</p>
					<p>Likestillingssenteret på Vestlandet</p>
				</div>
			</div>
		</div>
	);
}
