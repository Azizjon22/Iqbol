import "server-only";
import { getLocale } from "./locale";
import { trText } from "./tr";

export async function getTr() {
  const locale = await getLocale();
  return (text: string) => trText(locale, text);
}
