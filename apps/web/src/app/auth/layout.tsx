import Image from "next/image";
import Link from "next/link";
import type React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-100px)] items-center justify-center bg-slate-50 p-4 font-sans selection:bg-primary/10">
      <div className="flex w-full max-w-[1100px] overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="flex w-full flex-col justify-center px-8 py-12 sm:px-16 lg:w-1/2">
          <div className="mx-auto flex w-full max-w-sm flex-col">
            {children}
          </div>
        </div>

        <div className="relative hidden w-1/2 overflow-hidden bg-slate-950 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.88))]" />
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-[120px]" />

          <div className="relative flex h-full items-center justify-center p-16">
            <Image
              src="/logo.png"
              alt="Duty-Roster logo"
              height={160}
              width={160}
              className="rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
