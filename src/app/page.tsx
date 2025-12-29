import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, User, ArrowRight, Coffee, Clock, CheckCircle } from "lucide-react";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // If logged in, redirect to admin dashboard
  if (session) {
    const org = await getCurrentOrg();
    if (org) {
      redirect("/admin");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-100 mb-4">Cliq</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            The fastest way to connect cafes with reliable baristas
          </p>
        </div>

        {/* Split Choice */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Cafe Card */}
          <Link href="/for-cafes" className="group">
            <div className="h-full bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-amber-500/30 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mb-3">I&apos;m Hiring</h2>
              <p className="text-slate-400 mb-6">
                Find vetted, schedule-matched baristas ready to work your shifts.
              </p>
              <div className="flex items-center gap-2 text-amber-500 font-medium">
                <span>Get started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Barista Card */}
          <Link href="/for-baristas" className="group">
            <div className="h-full bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-emerald-500/30 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <User className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mb-3">I&apos;m Looking for Work</h2>
              <p className="text-slate-400 mb-6">
                Get matched to cafes near you that fit your schedule. No endless applications.
              </p>
              <div className="flex items-center gap-2 text-emerald-500 font-medium">
                <span>Find jobs</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Value Props */}
      <div className="border-t border-slate-800/80 bg-slate-900/50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">Hours, Not Weeks</h3>
              <p className="text-sm text-slate-500">Fill shifts faster with pre-vetted candidates</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">Schedule-Matched</h3>
              <p className="text-sm text-slate-500">Only see candidates who can work your shifts</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">Built for Cafes</h3>
              <p className="text-sm text-slate-500">Designed specifically for independent coffee shops</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <p className="text-sm text-slate-600">© 2025 Cliq</p>
          <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            Cafe Login
          </Link>
        </div>
      </footer>
    </div>
  );
}
