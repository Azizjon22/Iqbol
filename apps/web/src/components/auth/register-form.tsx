"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WORKER_GENDERS, WORKER_POSITIONS, workerRegisterSchema } from "@iqbol/shared";
import { Input, Label, Select, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/locale-provider";

export function RegisterForm() {
  const t = useT();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState<(typeof WORKER_POSITIONS)[number]>("WAITER_MALE");
  const [gender, setGender] = useState<(typeof WORKER_GENDERS)[number]>("MALE");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const parsed = workerRegisterSchema.safeParse({
      fullName,
      phone,
      position,
      gender,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Ro'yxatdan o'tishda xatolik yuz berdi");
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kutilmagan xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-sm rounded-lg border border-success/30 bg-success/10 p-6 text-center">
        <p className="font-medium text-success">Muvaffaqiyatli ro&apos;yxatdan o&apos;tdingiz!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Administrator tasdiqlashini kuting. Hozir kirish sahifasiga yo&apos;naltirilasiz.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <Label htmlFor="fullName">{t("workers.fullName")}</Label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="phone">{t("authExtra.phoneLabel")}</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998901234567"
          required
        />
      </div>
      <div>
        <Label htmlFor="position">{t("workers.position")}</Label>
        <Select
          id="position"
          value={position}
          onChange={(e) => setPosition(e.target.value as typeof position)}
        >
          {/* Chefs are added by the super admin, never through this public form. */}
          {WORKER_POSITIONS.filter((p) => p !== "CHEF").map((p) => (
            <option key={p} value={p}>
              {t(`workerPositions.${p}`)}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="gender">{t("workers.gender")}</Label>
        <Select
          id="gender"
          value={gender}
          onChange={(e) => setGender(e.target.value as typeof gender)}
        >
          {WORKER_GENDERS.map((g) => (
            <option key={g} value={g}>
              {t(`workerGenders.${g}`)}
            </option>
          ))}
        </Select>
      </div>
      <FieldError>{error}</FieldError>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? t("common.loading") : t("auth.register")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("auth.login")}
        </Link>
      </p>
    </form>
  );
}
