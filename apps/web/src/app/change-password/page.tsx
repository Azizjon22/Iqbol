import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { BrandMark } from "@/components/brand/brand-mark";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session || session.user.kind !== "STAFF") redirect("/login");
  if (!session.user.mustChangePassword) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark className="mb-3 h-11 w-11 text-lg" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Parolni yangilash</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Sizga admin tomonidan vaqtinchalik parol berilgan. Davom etishdan oldin o&apos;zingiz biladigan yangi
          parol o&apos;rnating — bundan buyon uni faqat siz bilasiz.
        </p>
      </div>
      <ChangePasswordForm />
    </main>
  );
}
