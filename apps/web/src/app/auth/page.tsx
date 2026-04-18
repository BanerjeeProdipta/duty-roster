"use client";

import { useState } from "react";
import SignInForm from "@/components/auth/sign-in-form";
import SignUpForm from "@/components/auth/sign-up-form";

export default function LoginPage() {
	const [isLogin, setIsLogin] = useState(true);

	return isLogin ? (
		<SignInForm onSwitchToSignUp={() => setIsLogin(false)} />
	) : (
		<SignUpForm onSwitchToSignIn={() => setIsLogin(true)} />
	);
}
