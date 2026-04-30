import { Suspense } from "react";
import Loader from "@/components/loader";
import AuthForms from "./auth-forms";

export default function LoginPage() {
	return (
		<Suspense fallback={<Loader />}>
			<AuthForms />
		</Suspense>
	);
}
