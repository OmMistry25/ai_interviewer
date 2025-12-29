import Link from "next/link";
import { 
  ArrowLeft, 
  Clock, 
  MapPin,
  CheckCircle,
  Coffee,
  Calendar,
  DollarSign,
} from "lucide-react";
import { LocationForm } from "./LocationForm";

export const metadata = {
  title: "For Baristas - Cliq",
  description: "Find barista jobs that match your schedule. No spam. Just real shifts at cafes near you.",
};

export default function ForBaristasPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/cafes" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-bold text-slate-100">Cliq</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-sm font-medium mb-6">
          <Coffee className="w-4 h-4" />
          For Baristas
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-100 mb-6 leading-tight">
          Stop mass applying.<br />Get matched.
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
          Tell us your schedule. We&apos;ll connect you with cafes that actually need 
          someone who can work those hours.
        </p>
        
        {/* Location Form */}
        <div className="max-w-md mx-auto">
          <LocationForm />
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-slate-800/80 bg-slate-900/30 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-12">
            No spam. No ghosting. Just real opportunities.
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">Schedule-first matching</h3>
                <p className="text-slate-400 text-sm">Only see jobs that fit when you&apos;re available</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">Quick 10-min interview</h3>
                <p className="text-slate-400 text-sm">AI-powered, no awkward phone screens</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">Local cafes near you</h3>
                <p className="text-slate-400 text-sm">Independent shops, not big chains</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1">Free for baristas</h3>
                <p className="text-slate-400 text-sm">Cafes pay, not you</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                1
              </div>
              <h3 className="font-semibold text-slate-100 mb-1 text-sm">Enter your location</h3>
              <p className="text-xs text-slate-500">We&apos;ll find cafes near you</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                2
              </div>
              <h3 className="font-semibold text-slate-100 mb-1 text-sm">Upload your resume</h3>
              <p className="text-xs text-slate-500">Quick profile setup</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                3
              </div>
              <h3 className="font-semibold text-slate-100 mb-1 text-sm">10-min AI interview</h3>
              <p className="text-xs text-slate-500">Show your personality</p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                4
              </div>
              <h3 className="font-semibold text-slate-100 mb-1 text-sm">Get matched</h3>
              <p className="text-xs text-slate-500">Cafes reach out to you</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="border-t border-slate-800/80 bg-slate-900/30 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            {[
              { label: "No endless forms", icon: CheckCircle },
              { label: "No resume black holes", icon: CheckCircle },
              { label: "Real cafes, real shifts", icon: CheckCircle },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-center gap-2">
                <item.icon className="w-5 h-5 text-emerald-500" />
                <span className="text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16">
        <div className="max-w-md mx-auto px-6 text-center">
          <h2 className="text-xl font-bold text-slate-100 mb-6">
            Ready to find your next gig?
          </h2>
          <LocationForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <p className="text-sm text-slate-600">© 2025 Cliq</p>
          <Link href="/cafes" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
            Back to Cafes
          </Link>
        </div>
      </footer>
    </div>
  );
}

