import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/data/session";

// Session gate must block: redirect decision cannot stream behind a shell.
export const instant = false;

export default async function Page() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard/catalog");
  }
  redirect("/sign-in");
}
