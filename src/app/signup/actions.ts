"use server";

import { isCloud } from "@/core/edition";
import { createClient } from "@/lib/supabase/server";

interface SignupResult {
    success: boolean;
    error?: string;
    requiresEmailConfirmation?: boolean;
}

export async function signupAction(formData: FormData, callbackUrl: string | null): Promise<SignupResult> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isDummyUrl = !supabaseUrl || supabaseUrl.includes("dummy") || supabaseUrl.includes("xyz.supabase.co");

    if (!isCloud || isDummyUrl) {
        return { success: false, error: "Sign up is only available on the cloud edition." };
    }

    const authHost = process.env.NEXT_PUBLIC_AUTH_HOST_URL ?? "";
    const next = callbackUrl ?? "/";
    const emailRedirectTo = `${authHost}/auth/callback?next=${encodeURIComponent(next)}`;

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
    });

    if (error) return { success: false, error: error.message };
    return { success: true, requiresEmailConfirmation: true };
}
