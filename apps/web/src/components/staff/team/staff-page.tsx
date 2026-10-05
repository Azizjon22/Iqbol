"use client";
import { useLocale, useTr } from "@/components/i18n/locale-provider";


import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChefHat,
  KeyRound,
  Pencil,
  Phone,
  Plus,
  Power,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { WORKER_GENDERS, WORKER_GENDER_LABELS_UZ, type StaffRole } from "@iqbol/shared";
import type { StaffUserSummary, WorkerSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PinModal } from "@/components/workers/team/pin-modal";
import { formatDate, cn } from "@/lib/utils";
import { AccountModal, ResetPasswordModal } from "./account-modal";
import { ROLE_META, ago, initials, staffApi } from "./helpers";

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; account: StaffUserSummary }
  | { kind: "reset"; account: StaffUserSummary }
  | { kind: "confirm"; title: string; message: string; label: string; safe?: boolean; run: () => Promise<void> }
  | { kind: "chef" }
  | { kind: "pin"; chef: WorkerSummary }
  | null;

const ROLE_ORDER: StaffRole[] = ["SUPER_ADMIN", "ADMIN", "ZAVZAL"];

function CreateChefModal({ onClose }: { onClose: () => void }) {
  const tr = useTr();

  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", phone: "+998", pin: "", gender: "FEMALE" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function save() {
    if (form.fullName.trim().length < 3) return setError(tr("Ism-familiyani kiriting"));
    if (!/^\+?[0-9]{9,15}$/.test(form.phone.replace(/\s/g, ""))) return setError(tr("Telefon raqami noto'g'ri"));
    if (!/^[0-9]{4}$/.test(form.pin)) return setError(tr("PIN 4 ta raqam bo'lishi kerak"));
    setBusy(true);
    setError(undefined);
    try {
      await staffApi("/workers", "POST", {
        fullName: form.fullName.trim(),
        phone: form.phone.replace(/\s/g, ""),
        pin: form.pin,
        gender: form.gender,
        position: "CHEF",
      });
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
      title={tr("Yangi oshpaz")}
      description={tr("Oshpaz telefon raqami va PIN bilan oshpaz ilovasiga kiradi.")}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            
            {tr("Bekor qilish")}
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? tr("Saqlanmoqda...") : tr("Qo'shish")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="chef-name">{tr("Ism-familiya")}</Label>
          <Input id="chef-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="chef-phone">{tr("Telefon (login)")}</Label>
          <Input id="chef-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
        </div>
        <div>
          <Label htmlFor="chef-pin">{tr("PIN (4 raqam)")}</Label>
          <Input
            id="chef-pin"
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            inputMode="numeric"
            placeholder="••••"
            className="tracking-[0.4em]"
          />
        </div>
        <div>
          <Label htmlFor="chef-gender">{tr("Jinsi")}</Label>
          <Select id="chef-gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            {WORKER_GENDERS.map((g) => (
              <option key={g} value={g}>
                {tr(WORKER_GENDER_LABELS_UZ[g])}
              </option>
            ))}
          </Select>
        </div>
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      </div>
    </Modal>
  );
}

function AccountCard({
  account,
  isSelf,
  onEdit,
  onReset,
  onToggle,
  onDelete,
}: {
  account: StaffUserSummary;
  isSelf: boolean;
  onEdit: () => void;
  onReset: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const tr = useTr();
  const locale = useLocale().locale;

  const meta = ROLE_META[account.role];
  return (
    <div className={cn("flex min-w-0 flex-col rounded-2xl border bg-card p-4 transition hover:shadow-md", account.isActive ? "border-border" : "border-dashed border-border opacity-70")}>
      <div className="flex items-start gap-3">
        <span className="relative shrink-0">
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold ring-2 ring-offset-2 ring-offset-card", meta.tone, meta.ring)}>
            {initials(account.fullName)}
          </span>
          <span
            className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card", account.isActive ? "bg-success" : "bg-muted-foreground")}
            title={account.isActive ? tr("Faol") : tr("Faol emas")}
          />
        </span>
        <div className="min-w-0 flex-1">
          {/* The name truncates; the "you" badge always stays visible. */}
          <p className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="truncate">{account.fullName}</span>
            {isSelf && <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{tr("Siz")}</span>}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.tone)}>{tr(meta.label)}</span>
            {!account.isActive && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">{tr("Faol emas")}</span>}
            {account.mustChangePassword && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{tr("Vaqtinchalik parol")}</span>
            )}
          </div>
        </div>
        <DropdownMenu
          items={[
            { label: tr("Tahrirlash"), icon: <Pencil className="h-4 w-4" />, onSelect: onEdit },
            { label: tr("Parolni tiklash"), icon: <KeyRound className="h-4 w-4" />, onSelect: onReset, hidden: isSelf },
            {
              label: account.isActive ? tr("Faolsizlantirish") : tr("Faollashtirish"),
              icon: account.isActive ? <Power className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />,
              onSelect: onToggle,
              hidden: isSelf,
            },
            { label: tr("O'chirish"), icon: <Trash2 className="h-4 w-4" />, onSelect: onDelete, tone: "danger", hidden: isSelf },
          ]}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground">{tr("Oxirgi faoliyat")}</p>
          <p className="mt-0.5 font-medium">{tr(ago(account.lastActivityAt))}</p>
        </div>
        <div className="rounded-xl bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground">{tr("Amallar")}</p>
          <p className="mt-0.5 font-medium tabular-nums">{account.activityCount ?? 0} ta</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <a href={`tel:${account.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
          <Phone className="h-3.5 w-3.5" /> {account.phone}
        </a>
        <span>{tr(`${formatDate(account.createdAt, locale)} dan`)}</span>
      </div>
    </div>
  );
}

export function StaffPage({ staff, chefs, currentUserId }: { staff: StaffUserSummary[]; chefs: WorkerSummary[]; currentUserId: string }) {
  const tr = useTr();

  const router = useRouter();
  const [tab, setTab] = useState<"accounts" | "chefs">("accounts");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [roleFilter, setRoleFilter] = useState<StaffRole | "ALL">("ALL");

  const active = staff.filter((s) => s.isActive);
  const sorted = [...staff].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );
  const shown = roleFilter === "ALL" ? sorted : sorted.filter((s) => s.role === roleFilter);
  // Captured once on mount — render stays pure.
  const [dayAgo] = useState(() => Date.now() - 24 * 60 * 60 * 1000);
  const activeToday = staff.filter((s) => s.lastActivityAt && new Date(s.lastActivityAt).getTime() > dayAgo).length;

  const stats = [
    { label: tr("Hisoblar"), value: staff.length, hint: tr(`${active.length} tasi faol`), icon: <Users className="h-5 w-5" /> },
    { label: tr("Adminlar"), value: staff.filter((s) => s.role !== "ZAVZAL").length, hint: tr("super admin + admin"), icon: <ShieldCheck className="h-5 w-5" /> },
    { label: tr("Bugun faol"), value: activeToday, hint: tr("so'nggi 24 soatda"), icon: <Activity className="h-5 w-5" /> },
    { label: tr("Oshpazlar"), value: chefs.filter((c) => c.status === "APPROVED").length, hint: tr("ilovaga kiradi"), icon: <ChefHat className="h-5 w-5" /> },
  ];

  const toggle = (a: StaffUserSummary) =>
    setDialog({
      kind: "confirm",
      title: a.isActive ? tr("Faolsizlantirish") : tr("Faollashtirish"),
      message: a.isActive
        ? tr(`${a.fullName} tizimga kira olmaydi, ochiq sessiyasi ham to'xtaydi. Tarixi saqlanadi, istalgan payt qayta faollashtirish mumkin.`)
        : tr(`${a.fullName} yana tizimga kira oladi.`),
      label: a.isActive ? tr("Faolsizlantirish") : tr("Faollashtirish"),
      safe: !a.isActive,
      run: async () => {
        await staffApi(`/staff-users/${a.id}`, "PATCH", { isActive: !a.isActive });
        router.refresh();
      },
    });

  const remove = (a: StaffUserSummary) =>
    setDialog({
      kind: "confirm",
      title: tr("Hisobni o'chirish"),
      message: tr(`${a.fullName} hisobi butunlay o'chiriladi. Agar u tizimda ishlagan bo'lsa (to'y, to'lov, ombor…), o'chirib bo'lmaydi — faolsizlantiring.`),
      label: tr("O'chirish"),
      run: async () => {
        await staffApi(`/staff-users/${a.id}`, "DELETE");
        router.refresh();
      },
    });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{tr("Xodimlar")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tr("Tizimga kiradigan hisoblar: adminlar, zavzallar va oshpazlar.")}</p>
        </div>
        <Button type="button" onClick={() => setDialog(tab === "accounts" ? { kind: "create" } : { kind: "chef" })}>
          <Plus className="h-4 w-4" /> {tab === "accounts" ? tr("Yangi hisob") : tr("Yangi oshpaz")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
            <div>
              <p className="text-xs text-muted-foreground">{tr(s.label)}</p>
              <p className="font-display mt-0.5 text-3xl font-semibold leading-none lining-nums tabular-nums">{s.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.hint}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">{s.icon}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-muted p-1">
          {(
            [
              ["accounts", tr(`Hisoblar (${staff.length})`)],
              ["chefs", tr(`Oshpazlar (${chefs.length})`)],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition",
                tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "accounts" && (
          <div className="flex flex-wrap gap-1.5">
            {(["ALL", ...ROLE_ORDER] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  roleFilter === r ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "ALL" ? tr("Hammasi") : tr(ROLE_META[r].label)} {r === "ALL" ? staff.length : staff.filter((s) => s.role === r).length}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "accounts" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((a) => (
            <AccountCard
              key={a.id}
              account={a}
              isSelf={a.id === currentUserId}
              onEdit={() => setDialog({ kind: "edit", account: a })}
              onReset={() => setDialog({ kind: "reset", account: a })}
              onToggle={() => toggle(a)}
              onDelete={() => remove(a)}
            />
          ))}
          <button
            type="button"
            onClick={() => setDialog({ kind: "create" })}
            className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium">{tr("Yangi hisob qo'shish")}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            
            {tr("Oshpazlar oshpaz ilovasiga telefon va PIN bilan kiradi: to'ylarni ko'radi va bozorlik ro'yxati yozadi.")}
          </p>
          {chefs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">{tr("Hali oshpaz qo'shilmagan.")}</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {chefs.map((c) => {
              const active = c.status === "APPROVED";
              return (
                <div key={c.id} className={cn("flex items-center gap-3 rounded-2xl border bg-card p-4", active ? "border-border" : "border-dashed border-border opacity-70")}>
                  {c.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photoUrl} alt={c.fullName} className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-success/50 ring-offset-2 ring-offset-card" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-sm font-bold text-success ring-2 ring-success/50 ring-offset-2 ring-offset-card">
                      {initials(c.fullName)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.fullName}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          active ? "bg-success/15 text-success" : c.status === "PENDING" ? "bg-accent/15 text-accent" : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {active ? tr("Faol") : c.status === "PENDING" ? "Kutilmoqda" : tr("Faol emas")}
                      </span>
                      {c.mustChangePin && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{tr("Vaqtinchalik PIN")}</span>}
                    </div>
                  </div>
                  <DropdownMenu
                    items={[
                      { label: "PIN kodni tiklash", icon: <KeyRound className="h-4 w-4" />, onSelect: () => setDialog({ kind: "pin", chef: c }), hidden: !active },
                      {
                        label: active ? tr("Faolsizlantirish") : tr("Faollashtirish"),
                        icon: active ? <Power className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />,
                        onSelect: () =>
                          setDialog({
                            kind: "confirm",
                            title: active ? tr("Faolsizlantirish") : tr("Faollashtirish"),
                            message: active ? `${c.fullName} oshpaz ilovasiga kira olmaydi.` : `${c.fullName} yana ilovaga kira oladi.`,
                            label: active ? tr("Faolsizlantirish") : tr("Faollashtirish"),
                            safe: !active,
                            run: async () => {
                              await staffApi(`/workers/${c.id}/${active ? "reject" : "approve"}`, "PATCH");
                              router.refresh();
                            },
                          }),
                      },
                    ]}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dialog?.kind === "create" && <AccountModal onClose={() => setDialog(null)} />}
      {dialog?.kind === "edit" && <AccountModal account={dialog.account} isSelf={dialog.account.id === currentUserId} onClose={() => setDialog(null)} />}
      {dialog?.kind === "reset" && <ResetPasswordModal account={dialog.account} onClose={() => setDialog(null)} />}
      {dialog?.kind === "chef" && <CreateChefModal onClose={() => setDialog(null)} />}
      {dialog?.kind === "pin" && <PinModal worker={dialog.chef} onClose={() => setDialog(null)} />}
      {dialog?.kind === "confirm" && (
        <ConfirmDialog
          open
          onClose={() => setDialog(null)}
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.label}
          destructive={!dialog.safe}
          onConfirm={dialog.run}
        />
      )}
    </div>
  );
}
