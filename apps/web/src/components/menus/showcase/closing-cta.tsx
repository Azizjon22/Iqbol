"use client";

import { Phone } from "lucide-react";
import { OrnamentalPattern } from "@/components/menus/ornamental-pattern";
import { OrnamentDivider } from "@/components/menus/showcase/ornament-divider";
import { Reveal } from "@/components/menus/showcase/reveal";
import { useT } from "@/components/i18n/locale-provider";

export function ClosingCta({ title, subtitle }: { title: string; subtitle: string }) {
  const t = useT();
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+998 90 000 00 00";

  return (
    <section className="relative isolate overflow-hidden bg-[#071422] px-4 py-20 text-center text-white sm:py-28">
      <OrnamentalPattern id="cta-ornament" className="-z-10 text-[#5eb6ef] opacity-[0.07]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_70%_at_50%_50%,rgba(212,120,150,0.18),transparent)]" />
      <Reveal className="mx-auto max-w-2xl 2xl:max-w-3xl">
        <OrnamentDivider className="text-[#5eb6ef]" />
        <h2 className="font-display mt-6 text-[clamp(2rem,4.5vw,4rem)] font-semibold leading-tight">{title}</h2>
        <p className="mt-3 text-white/65">{subtitle}</p>
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="mt-8 inline-flex items-center gap-3 whitespace-nowrap rounded-full bg-gradient-to-r from-[#2b7ec4] via-[#d6efff] to-[#2b7ec4] px-6 py-3.5 text-lg font-semibold text-[#071422] shadow-xl shadow-[#5eb6ef]/20 transition-transform hover:scale-[1.03] min-[400px]:px-8 min-[400px]:py-4 min-[400px]:text-xl sm:text-2xl"
        >
          <Phone className="h-5 w-5" /> {phone}
        </a>
        <p className="font-display mt-12 text-2xl text-white/50">{t("common.brand")}</p>
      </Reveal>
    </section>
  );
}
