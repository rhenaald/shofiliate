import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/data/session";

export default async function Page() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard/catalog");
  }
  redirect("/sign-in");
}
