import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  const safeCallback = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/alerts";

  async function send(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    if (!email) redirect("/signin?error=missing");
    await signIn("resend", { email, redirectTo: safeCallback });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 rounded-2xl border border-line bg-white p-8">
      <h1 className="font-display text-3xl font-bold">Sign in</h1>
      <p className="text-muted">We&apos;ll email you a sign-in link. No password needed. You only need an account for price alerts.</p>
      {error && <p role="alert" className="rounded-xl bg-[#fff4e6] px-4 py-3 text-[#5c3000]">Sign-in didn&apos;t work. Check the email address and try again.</p>}
      <form action={send} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-semibold text-muted">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="h-12 rounded-xl border border-[#c4ccd4] px-3" />
        <button className="h-12 rounded-xl bg-accent font-bold text-white hover:bg-accent-dark">Email me a link</button>
      </form>
    </div>
  );
}
