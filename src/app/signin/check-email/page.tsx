export default function CheckEmail() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 rounded-2xl border border-line bg-white p-8">
      <h1 className="font-display text-3xl font-bold">Check your email</h1>
      <p className="text-muted">We sent you a sign-in link. It works once and expires in 24 hours. Check your spam folder if it doesn&apos;t arrive in a minute.</p>
    </div>
  );
}
