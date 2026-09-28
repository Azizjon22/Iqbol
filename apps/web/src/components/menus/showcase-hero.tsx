import { OrnamentalPattern } from "./ornamental-pattern";
import { BrandMark } from "@/components/brand/brand-mark";

export function ShowcaseHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="relative overflow-hidden border-b border-border">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_-10%,var(--surface-glow),transparent)]" />
      <OrnamentalPattern id="hero-ornament" className="text-primary opacity-[0.04]" />
      <div className="relative mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <BrandMark className="mx-auto mb-5 h-14 w-14 text-2xl shadow-lg shadow-primary/25 animate-soft-scale" />
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl animate-fade-up">{title}</h1>
        <div className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-accent to-transparent" />
        <p className="mx-auto mt-5 max-w-xl text-sm text-muted-foreground sm:text-base animate-fade-up">{subtitle}</p>
      </div>
    </div>
  );
}
