"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { Input } from "@Duty-Roster/ui/components/input";
import { Label } from "@Duty-Roster/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const form = useForm({
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			if (!token) {
				toast.error("Invalid reset token");
				return;
			}

			if (value.password !== value.confirmPassword) {
				toast.error("Passwords do not match");
				return;
			}

			await authClient.resetPassword(
				{
					newPassword: value.password,
					token,
				},
				{
					onSuccess: () => {
						toast.success("Password reset successful");
						router.push("/auth");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				password: z.string().min(8, "Password must be at least 8 characters"),
				confirmPassword: z.string(),
			}),
		},
	});

	if (!token) {
		return (
			<div>
				<h1 className="mb-2 text-center font-bold text-3xl">Invalid Link</h1>
				<p className="text-center text-muted-foreground">
					This password reset link is invalid or has expired.
				</p>
			</div>
		);
	}

	return (
		<div>
			<h1 className="mb-2 text-center font-bold text-3xl">Reset Password</h1>
			<p className="mb-6 text-center text-muted-foreground">
				Enter your new password below.
			</p>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<div>
					<form.Field name="password">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>New Password</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.map((error) => (
									<p
										key={typeof error === "string" ? error : error?.message}
										className="text-red-500"
									>
										{typeof error === "string" ? error : error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<div>
					<form.Field name="confirmPassword">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Confirm Password</Label>
								<Input
									id={field.name}
									name={field.name}
									type="password"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.map((error) => (
									<p
										key={typeof error === "string" ? error : error?.message}
										className="text-red-500"
									>
										{typeof error === "string" ? error : error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
				>
					{({ canSubmit, isSubmitting }) => (
						<Button
							type="submit"
							className="w-full"
							disabled={!canSubmit || isSubmitting}
						>
							{isSubmitting ? "Resetting..." : "Reset Password"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={<div className="text-center">Loading...</div>}>
			<ResetPasswordForm />
		</Suspense>
	);
}
