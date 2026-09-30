"use client";
import { useTr } from "@/components/i18n/locale-provider";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, RefreshCw } from "lucide-react";
import type { StaffRole } from "@iqbol/shared";
import type { StaffUserSummary } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ROLE_META, generatePassword, staffApi } from "./helpers";

/** A temporary password field with a generator and copy button. */
export function TempPassword({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tr = useTr();

  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono tracking-wide" minLength={6} />
        <Button type="button" variant="outline" onClick={() => onChange(generatePassword())} title={tr("Yangi parol yaratish")} aria-label={tr("Yangi parol yaratish")}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard?.writeText(value).catch(() => undefined);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          title={tr("Nusxalash")}
          aria-label={tr("Nusxalash")}
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{tr("Vaqtinchalik parol — xodim birinchi kirishda o'zi almashtiradi.")}</p>
    </div>
  );
}

export function AccountModal({ account, isSelf, onClose }: { account?: StaffUserSummary; isSelf?: boolean; onClose: () => void }) {
  const tr = useTr();

  const router = useRouter();
  const [fullName, setFullName] = useState(account?.fullName ?? "");
  const [phone, setPhone] = useState(account?.phone ?? "+998");
  const [role, setRole] = useState<StaffRole>(account?.role ?? "ADMIN");
  const [password, setPassword] = useState(() => (account ? "" : generatePassword()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function save() {
    const cleanPhone = phone.replace(/\s/g, "");
    if (fullName.trim().length < 3) return setError(tr("Ism-familiyani to'liq kiriting"));
    if (!/^\+?[0-9]{9,15}$/.test(cleanPhone)) return setError(tr("Telefon raqami noto'g'ri"));
    if (!account && password.length < 6) return setError(tr("Parol kamida 6 belgi"));
    setBusy(true);
    setError(undefined);
    try {
      if (account) {
        await staffApi(`/staff-users/${account.id}`, "PATCH", {
          fullName: fullName.trim(),
          phone: cleanPhone,
          ...(isSelf ? {} : { role }),
        });
      } else {
        await staffApi("/staff-users", "POST", { fullName: fullName.trim(), phone: cleanPhone, role, password });
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={account ? tr("Hisobni tahrirlash") : tr("Yangi hisob")}
      description={account ? undefined : tr("Xodim telefon raqami va shu parol bilan kiradi.")}
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            
            {tr("Bekor qilish")}
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? tr("Saqlanmoqda...") : account ? tr("Saqlash") : tr("Hisob yaratish")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">{tr("Rol")}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(ROLE_META) as StaffRole[]).map((r) => {
              const meta = ROLE_META[r];
              const on = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={isSelf}
                  onClick={() => setRole(r)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition disabled:cursor-not-allowed",
                    on ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40",
                    isSelf && !on && "opacity-40",
                  )}
                >
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", meta.tone)}>{tr(meta.label)}</span>
                  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {meta.can.map((c) => (
                      <li key={c}>• {tr(c)}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
          {isSelf && <p className="mt-1.5 text-xs text-muted-foreground">{tr("O'z rolingizni o'zgartira olmaysiz.")}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="acc-name">{tr("Ism-familiya")}</Label>
            <Input id="acc-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={tr("masalan: Dilnoza Karimova")} />
          </div>
          <div>
            <Label htmlFor="acc-phone">{tr("Telefon (login)")}</Label>
            <Input id="acc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </div>
        </div>
        {!account && (
          <div>
            <Label>{tr("Parol")}</Label>
            <TempPassword value={password} onChange={setPassword} />
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  );
}

export function ResetPasswordModal({ account, onClose }: { account: StaffUserSummary; onClose: () => void }) {
  const tr = useTr();

  const router = useRouter();
  const [password, setPassword] = useState(() => generatePassword());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function save() {
    if (password.length < 6) return setError(tr("Parol kamida 6 belgi"));
    setBusy(true);
    setError(undefined);
    try {
      await staffApi(`/staff-users/${account.id}`, "PATCH", { password });
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={tr("Parolni tiklash")}
      description={account.fullName}
      size="sm"
      footer={
        done ? (
          <Button type="button" onClick={onClose}>
            Tayyor
          </Button>
        ) : (
          <>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              
              {tr("Bekor qilish")}
            </Button>
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? tr("Saqlanmoqda...") : tr("Parolni o'rnatish")}
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm text-success">
            <Check className="h-4 w-4" />  {tr("Parol yangilandi. Xodimga yetkazing:")}
          </p>
          <p className="rounded-xl bg-muted px-3 py-2 font-mono text-lg tracking-wide">{password}</p>
          <p className="text-xs text-muted-foreground">{tr("Keyingi kirishda u parolni o'zi almashtiradi.")}</p>
        </div>
      ) : (
        <>
          <TempPassword value={password} onChange={setPassword} />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </>
      )}
    </Modal>
  );
}
