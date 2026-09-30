import { apiFetch } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { EventDetail, WorkerSummary } from "@/lib/types";
import { TeamPage } from "@/components/workers/team/team-page";
import type { StaffingEvent, TeamWorker } from "@/components/workers/team/types";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default async function WorkersPage() {
  const [workers, allEvents, session] = await Promise.all([
    apiFetch<WorkerSummary[]>("/workers"),
    apiFetch<EventDetail[]>("/events"),
    getSession(),
  ]);
  const role = session?.user.kind === "STAFF" ? session.user.role : "ADMIN";

  // Same "not archived" rule as the To'ylar page: dated today or later.
  const today = startOfDay(new Date());
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const upcoming = allEvents
    .filter((e) => e.status !== "CANCELLED" && startOfDay(new Date(e.eventDate)) >= today)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const events: StaffingEvent[] = upcoming.map((e) => ({
    id: e.id,
    clientName: e.clientName,
    eventDate: e.eventDate,
    guestCount: e.guestCount,
    assignedWorkerIds: e.assignments.map((a) => a.workerId),
  }));

  const team: TeamWorker[] = workers.map((w) => ({
    ...w,
    upcoming: upcoming
      .filter((e) => e.assignments.some((a) => a.workerId === w.id))
      .map((e) => ({ id: e.id, clientName: e.clientName, eventDate: e.eventDate })),
  }));

  const busyThisWeek = team.filter(
    (w) => w.status === "APPROVED" && w.upcoming.some((u) => new Date(u.eventDate) < weekEnd),
  ).length;

  return <TeamPage workers={team} events={events} role={role} busyThisWeek={busyThisWeek} />;
}
