import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const tasks = [
  "Review class assignment details",
  "Pick a clear essay angle",
  "Generate outline with brainstorm tool"
];

export default async function DashboardPage() {
  const hasSupabaseConfig =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!hasSupabaseConfig) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">
          Supabase is not configured yet, so this is running in demo mode.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Today">
            <p className="text-sm text-slate-600">You have 3 writing tasks ready to start.</p>
          </Card>
          <Card title="Quick checklist">
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
              {tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="text-sm text-slate-600">Signed in as {user.email}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Today">
          <p className="text-sm text-slate-600">You have 3 writing tasks ready to start.</p>
        </Card>
        <Card title="Quick checklist">
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
            {tasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
