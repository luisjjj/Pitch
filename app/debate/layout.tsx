import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DebateLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) redirect("/auth?next=/debate/new");
  return children;
}
