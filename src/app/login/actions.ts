"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isCloud } from "@/core/edition";
import { createClient } from "@/lib/supabase/server";

interface LoginResult {
    success: boolean;
    error?: string;
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isDummyUrl = !supabaseUrl || supabaseUrl.includes("dummy") || supabaseUrl.includes("xyz.supabase.co");

    if (isCloud && !isDummyUrl) {
        const supabase = await createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };
        return { success: true };
    }
    try {
        await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        return { success: true };
    } catch (error) {
        if (error instanceof AuthError) {
            return {
                success: false,
                error: error.type === "CredentialsSignin"
                    ? "Invalid email or password."
                    : "Something went wrong.",
            };
        }
        throw error;
    }
}
