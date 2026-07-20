"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function AuthForm() {
  const router = useRouter();
  const query = useSearchParams();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const destination = query.get("next")?.startsWith("/") ? query.get("next")! : "/dashboard";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password, callbackURL: destination })
        : await authClient.signUp.email({ name, email, password, callbackURL: destination });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "We couldn't complete that request.");
      return;
    }
    router.replace(destination);
    router.refresh();
  }

  async function googleSignIn() {
    setError("");
    setPending(true);
    const result = await authClient.signIn.social({ provider: "google", callbackURL: destination });
    if (result.error) {
      setError(result.error.message ?? "Google sign-in is not configured yet.");
      setPending(false);
    }
  }

  return (
    <section className="auth-card card">
      <div className="eyebrow">Enter the arena</div>
      <h1 className="display">{mode === "sign-in" ? "WELCOME BACK." : "MAKE A NAME."}</h1>
      <p>Build your record, protect your streak, and make every argument count.</p>
      <form onSubmit={submit} className="auth-form">
        {mode === "sign-up" && (
          <label>
            Display name
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="How the arena knows you" />
          </label>
        )}
        <label>
          Email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button disabled={pending} className="button auth-submit">
          {pending ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <>
              {mode === "sign-in" ? "Enter Pitch" : "Create account"}
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>
      <div className="auth-divider"><span>or</span></div>
      <button className="google-button" disabled={pending} onClick={googleSignIn}>
        G Continue with Google
      </button>
      <button
        className="auth-switch"
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError("");
        }}
      >
        {mode === "sign-in" ? "New to Pitch? Create an account" : "Already have an account? Sign in"}
      </button>
      <div className="auth-security">
        <ShieldCheck size={16} /> Secure sessions powered by Better Auth
      </div>
    </section>
  );
}

export default function AuthPage() {
  return (
    <main className="auth-page">
      <Link href="/" className="brand"><i className="brand-mark" />PITCH</Link>
      <Suspense
        fallback={
          <section className="auth-card card">
            <div className="eyebrow">Loading...</div>
          </section>
        }
      >
        <AuthForm />
      </Suspense>
    </main>
  );
}
