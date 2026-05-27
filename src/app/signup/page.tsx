"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signupAction } from "./actions";
import styles from "../setup/setup.module.css";

function SignupForm() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;
        const confirm = formData.get("confirm") as string;

        if (password !== confirm) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        const result = await signupAction(formData, callbackUrl);

        if (result.success) {
            setDone(true);
        } else {
            setError(result.error ?? "Sign up failed.");
            setLoading(false);
        }
    }

    if (done) {
        return (
          <div className={styles.container}>
            <div className={styles.card}>
              <div className={styles.logo}>W</div>
              <h1 className={styles.title}>Check your email</h1>
              <p className={styles.subtitle}>
                We sent a confirmation link to your address. Click it to activate your
                account and return to where you left off.
              </p>
            </div>
          </div>
        );
    }

    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>W</div>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>Join WorldWideView to install and manage plugins</p>

          <form onSubmit={handleSubmit} method="post" className={styles.form}>
            <label className={styles.label} htmlFor="email">
              Email
              <input
                id="email"
                name="email"
                type="email"
                required
                className={styles.input}
                placeholder="you@example.com"
              />
            </label>

            <label className={styles.label} htmlFor="password">
              Password
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className={styles.input}
              />
            </label>

            <label className={styles.label} htmlFor="confirm">
              Confirm password
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                className={styles.input}
              />
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" disabled={loading} className={styles.button}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className={styles.footer}>
            Already have an account?{" "}
            <a
              href={`/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className={styles.link}
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    );
}

export default function SignupPage() {
    return (
      <Suspense>
        <SignupForm />
      </Suspense>
    );
}
