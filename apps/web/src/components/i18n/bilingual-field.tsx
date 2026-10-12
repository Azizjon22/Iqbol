"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useTr } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

/**
 * One control, two languages. The UZ/RU pill changes only this field.
 * Both values are submitted as hidden inputs (`name` and `nameRu`).
 */
export function BilingualField({
  name,
  nameRu,
  label,
  defaultValue = "",
  defaultValueRu = "",
  required,
  multiline,
  rows = 3,
  placeholder,
  maxLength,
  className,
  submit = true,
  onValues,
}: {
  name: string;
  nameRu?: string;
  label?: string;
  defaultValue?: string | null;
  defaultValueRu?: string | null;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  /** When false, values stay in React state and are not written into the form. */
  submit?: boolean;
  onValues?: (uz: string, ru: string) => void;
}) {
  const tr = useTr();
  const ruName = nameRu ?? `${name}Ru`;
  const [lang, setLang] = useState<"uz" | "ru">("uz");
  const [uz, setUz] = useState(defaultValue ?? "");
  const [ru, setRu] = useState(defaultValueRu ?? "");
  const [error, setError] = useState<string>();
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const value = lang === "uz" ? uz : ru;

  useEffect(() => {
    if (!submit) return;
    const form = root.current?.closest("form");
    if (!form || !required) return;
    const onSubmit = (event: Event) => {
      if (uz.trim() && ru.trim()) return;
      event.preventDefault();
      event.stopPropagation();
      setLang(uz.trim() ? "ru" : "uz");
      setError(tr("Ikkala tilda ham yozing"));
    };
    form.addEventListener("submit", onSubmit, true);
    return () => form.removeEventListener("submit", onSubmit, true);
  }, [required, ru, submit, tr, uz]);

  function change(next: string) {
    const nextUz = lang === "uz" ? next : uz;
    const nextRu = lang === "ru" ? next : ru;
    if (lang === "uz") setUz(next);
    else setRu(next);
    setError(undefined);
    onValues?.(nextUz, nextRu);
  }

  const fieldProps = {
    id,
    value,
    maxLength,
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(e.target.value),
  };

  return (
    <div ref={root} className={className}>
      {submit && (
        <>
          <input type="hidden" name={name} value={uz} />
          <input type="hidden" name={ruName} value={ru} />
        </>
      )}
      <div className={cn("flex items-center justify-between gap-2", label ? "mb-1.5" : "mb-1")}>
        {label ? (
          <Label htmlFor={id}>
            {label}
            {required ? " *" : ""}
          </Label>
        ) : (
          <span />
        )}
        <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/60 p-0.5 text-xs font-semibold">
          {(["uz", "ru"] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              className={cn(
                "rounded-full px-2.5 py-1 uppercase transition-colors",
                lang === code ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {code}
            </button>
          ))}
        </div>
      </div>
      {multiline ? <Textarea rows={rows} {...fieldProps} /> : <Input {...fieldProps} />}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
