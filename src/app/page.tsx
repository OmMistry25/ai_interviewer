import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { signOut } from "./(auth)/actions";
import { createOrganization } from "./(auth)/org-actions";
import Link from "next/link";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const org = session ? await getCurrentOrg() : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <main className="text-center text-white space-y-4">
        <h1 className="text-2xl font-bold">AI Video Interviewer</h1>
        
        {session ? (
          <>
            <p className="text-zinc-400">Logged in as {session.user.email}</p>
            
            {org ? (
              <div className="p-4 bg-zinc-800 rounded">
                <p className="text-green-400">Organization: {org.name}</p>
                <p className="text-zinc-500 text-sm">Role: {org.role}</p>
              </div>
            ) : (
              <form action={createOrganization} className="space-y-2">
                <input
                  name="name"
                  type="text"
                  placeholder="Organization name"
                  required
                  className="p-2 rounded bg-zinc-800 text-white border border-zinc-700"
                />
                <button
                  type="submit"
                  className="block w-full px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  Create Organization
                </button>
              </form>
            )}
            
            <form action={signOut}>
              <button
                type="submit"
                className="px-4 py-2 rounded bg-zinc-700 text-white hover:bg-zinc-600"
              >
                Sign Out
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-zinc-400">Not logged in</p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Login
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
