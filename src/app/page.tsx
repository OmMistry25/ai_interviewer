import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/supabase/helpers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { 
  Zap, 
  Clock, 
  Target, 
  BarChart3, 
  ArrowRight,
  Coffee,
  Building2,
  ChevronDown,
  CheckCircle
} from "lucide-react";

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
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold text-xl text-slate-100">
            Cliq
          </Link>
          <div className="flex items-center gap-6">
            {/* Industry Solutions Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium">
                Solutions
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30">
                <div className="p-2">
                  <p className="px-3 py-2 text-xs text-slate-500 font-medium uppercase tracking-wide">Industries</p>
                  <Link 
                    href="/cafes" 
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Coffee className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Cafes & Coffee Shops</p>
                      <p className="text-xs text-slate-500">Hire baristas fast</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3 px-3 py-3 rounded-lg opacity-50 cursor-not-allowed">
                    <div className="w-8 h-8 rounded-lg bg-slate-700/50 text-slate-500 flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-400">More Industries</p>
                      <p className="text-xs text-slate-600">Coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Link href="/login">
              <Button variant="primary" size="sm">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-sm font-medium mb-8">
          <Zap className="w-4 h-4" />
          AI-Powered Hiring Platform
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-100 mb-6 leading-tight">
          Hire smarter.<br />Hire faster.
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Streamline your hiring pipeline with AI-powered screening, automated interviews, 
          and data-driven candidate matching. Built for industries where reliability matters.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/cafes">
            <Button variant="primary" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
              Explore Solutions
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Value Props */}
      <section className="border-t border-slate-800/80 bg-slate-900/30 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-100 mb-4">
              Why businesses choose Cliq
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Stop wasting hours on unqualified candidates. Our AI screens, interviews, 
              and matches so you can focus on running your business.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-5">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">10x Faster Hiring</h3>
              <p className="text-slate-500 text-sm">
                Fill positions in hours instead of weeks. AI handles screening and initial interviews automatically.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-5">
                <Target className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Better Matches</h3>
              <p className="text-slate-500 text-sm">
                Pre-vetted candidates matched to your specific needs. Only see people who can actually do the job.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-5">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Data-Driven Decisions</h3>
              <p className="text-slate-500 text-sm">
                Get objective evaluations and scores. Make confident hiring decisions backed by AI analysis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Solutions */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-100 mb-4">
              Industry-Specific Solutions
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Tailored hiring workflows for industries where finding the right people is critical.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Cafes - Active */}
            <Link href="/cafes" className="group">
              <div className="h-full bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/70 hover:border-amber-500/30 transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Coffee className="w-7 h-7" />
                  </div>
                  <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                    Available
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-2">Cafes & Coffee Shops</h3>
                <p className="text-slate-400 mb-6">
                  Find reliable baristas who match your schedule and culture. 
                  Pre-screened for customer service skills.
                </p>
                <div className="flex items-center gap-2 text-amber-500 font-medium">
                  <span>Get started</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
            
            {/* Coming Soon */}
            <div className="h-full bg-slate-800/30 border border-slate-700/30 rounded-2xl p-8 opacity-60">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-xl bg-slate-700/50 text-slate-500 flex items-center justify-center">
                  <Building2 className="w-7 h-7" />
                </div>
                <span className="px-2 py-1 rounded-full bg-slate-700/50 text-slate-500 text-xs font-medium">
                  Coming Soon
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-400 mb-2">More Industries</h3>
              <p className="text-slate-500 mb-6">
                Retail, restaurants, hospitality, and more. 
                We&apos;re expanding to new industries soon.
              </p>
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <span>Notify me</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-slate-800/80 bg-slate-900/30 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-100 mb-4">
              How It Works
            </h2>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: "Post Your Role", desc: "Set your requirements and schedule needs" },
              { step: 2, title: "Candidates Apply", desc: "They complete our AI-powered screening" },
              { step: 3, title: "Review Matches", desc: "See pre-vetted candidates with scores" },
              { step: 4, title: "Make the Hire", desc: "Connect directly with top candidates" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-100 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              "AI-powered screening",
              "Built for reliability",
              "Fast, data-driven hiring",
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="text-slate-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800/80 bg-gradient-to-b from-slate-900/50 to-slate-950 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-100 mb-4">
            Ready to transform your hiring?
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Join businesses that hire smarter with Cliq.
          </p>
          <Link href="/cafes">
            <Button variant="primary" size="lg">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <p className="text-sm text-slate-600">© 2025 Cliq</p>
          <div className="flex items-center gap-6">
            <Link href="/cafes" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              Cafes
            </Link>
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
