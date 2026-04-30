"use client";

import { useState } from "react";
import SignInForm from "@/features/auth/components/sign-in-form";
import SignUpForm from "@/features/auth/components/sign-up-form";

export default function AuthForms() {
	const [isLogin, setIsLogin] = useState(true);

	return isLogin ? (
		<SignInForm onSwitchToSignUp={() => setIsLogin(false)} />
	) : (
		<SignUpForm onSwitchToSignIn={() => setIsLogin(true)} />
	);
}
