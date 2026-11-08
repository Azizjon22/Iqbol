import Link from "next/link";
import { CalendarHeart, ChefHat, Plus, ShoppingCart } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { ShoppingList } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ChefEventCard } from "@/components/worker/chef/chef-event-card";
import { ChefListCard } from "@/components/worker/chef/chef-list-card";
import { OrnamentDivider } from "@/components/menus/showcase/ornament-divider";
import { WEEKDAYS, daysUntil, type ChefEvent } from "@/components/worker/chef/types";

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tashkent", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return hour < 12 ? "Xayrli tong" : hour < 18 ? "Xayrli kun" : "Xayrli kech";
}

export default async function WorkerHomePage() {
  const session = await getSession();
  const isChef = session?.user.kind === "WORKER" && session.user.position === "CHEF";
  const [myLists, agenda] = await Promise.all([
    apiFetch<ShoppingList[]>("/shopping-lists/mine"),
    isChef ? apiFetch<ChefEvent[]>("/events/chef-agenda").catch(() => []) : Promise.resolve<ChefEvent[]>([]),
  ]);

  const next = agenda[0];
  const week = agenda.filter((e) => daysUntil(e.eventDate) < 7);
  const withoutList = agenda.filter((e) => e.shoppingLists.length === 0 && daysUntil(e.eventDate) < 7);
  const active = myLists.filter((l) => l.status !== "CLOSED").slice(0, 2);
  const today = new Date();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="relative -mx-4 overflow-hidden px-4 pb-1 pt-2 sm:mx-0 sm:rounded-2xl sm:px-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--surface-glow),transparent_60%)]" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            {WEEKDAYS[today.getDay()]} · {formatDate(today)}
          </p>
          <h1 className="font-display mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">
            {greeting()}, {session?.user.fullName.split(" ")[0]}
          </h1>
          <OrnamentDivider align="start" className="mt-2 text-accent" />
          {isChef && (
            <p className="mt-2.5 text-sm text-muted-foreground">
              {week.length > 0 ? `Bu hafta ${week.length} ta to'y` : "Bu hafta to'y yo'q"}
              {withoutList.length > 0 && ` · ${withoutList.length} tasiga bozorlik yozilmagan`}
            </p>
          )}
        </div>
      </div>

      {isChef && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <CalendarHeart className="h-4 w-4 text-primary" /> Keyingi to&apos;y
              </h2>
              <span className="mt-1 block h-0.5 w-8 rounded-full bg-gradient-to-r from-accent to-accent/10" />
            </div>
            <Link href="/worker/events" className="text-sm text-primary hover:underline">
              Hammasi ({agenda.length}) →
            </Link>
          </div>
          {next ? (
            <ChefEventCard event={next} defaultOpen variant="hero" />
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
              <CalendarHeart className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Hozircha rejada to&apos;y yo&apos;q — yangisi qo&apos;shilganda shu yerda chiqadi.</p>
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/worker/shopping"
          className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-4 transition hover:shadow-md"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold leading-tight">Yangi bozorlik ro&apos;yxati</span>
        </Link>
        <Link
          href="/worker/shopping?tab=mine"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:shadow-md"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold leading-tight">
            Ro&apos;yxatlarim <span className="text-muted-foreground">({myLists.length})</span>
          </span>
        </Link>
      </div>

      {active.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <ChefHat className="h-4 w-4 text-accent" /> Ro&apos;yxatlarim holati
            </h2>
            <span className="mt-1 block h-0.5 w-8 rounded-full bg-gradient-to-r from-accent to-accent/10" />
          </div>
          {active.map((l) => (
            <ChefListCard key={l.id} list={l} compact />
          ))}
        </section>
      )}
    </div>
  );
}
