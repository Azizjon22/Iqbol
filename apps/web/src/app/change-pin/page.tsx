import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ChangePinForm } from "@/components/auth/change-pin-form";
import { BrandMark } from "@/components/brand/brand-mark";

export default async function ChangePinPage() {
  const session = await getSession();
  if (!session || session.user.kind !== "WORKER") redirect("/login");
  if (!session.user.mustChangePin) redirect("/worker");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <BrandMark className="mb-3 h-11 w-11 text-lg" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">PIN kodni yangilash</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Sizga admin tomonidan vaqtinchalik PIN kod berilgan. Davom etishdan oldin o&apos;zingiz biladigan yangi
          PIN o&apos;rnating — bundan buyon uni faqat siz bilasiz.
        </p>
      </div>
      <ChangePinForm />
    </main>
  );
}
