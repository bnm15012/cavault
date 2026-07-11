import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/" });
    return { user: session };
  },
  component: () => <Outlet />,
});
