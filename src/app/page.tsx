"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  Zap,
  Users,
  BarChart3,
  Clock,
  Bell,
  ArrowRight,
  Building2,
  Sparkles,
  Star,
  MessageSquare,
  Check,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const features = [
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: "Complete Data Isolation",
      description: "Multi-tenancy with PostgreSQL RLS ensures 100% security of your data"
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Automation",
      description: "SLA policies, automatic agent assignment and ticket processing rules"
    },
    {
      icon: <Users className="h-8 w-8 text-green-600" />,
      title: "Team Management",
      description: "Flexible role and permission system for efficient work"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      title: "Real-time Analytics",
      description: "Detailed reports and charts for decision making"
    },
    {
      icon: <Clock className="h-8 w-8 text-orange-600" />,
      title: "SLA Monitoring",
      description: "Track response and resolution time with visual indicators"
    },
    {
      icon: <Bell className="h-8 w-8 text-red-600" />,
      title: "Smart Notifications",
      description: "Group similar notifications and flexible delivery settings"
    },
    {
      icon: <Building2 className="h-8 w-8 text-cyan-600" />,
      title: "LDAP/Active Directory",
      description: "Integration with corporate infrastructure in 2 minutes"
    }
  ];

  const trustedBy = ["NovaTech", "Qala Group", "SignalOps", "Aster Cloud", "Northline", "DeskFlow"];

  const testimonials = [
    {
      quote:
        "Мы снизили время первого ответа почти вдвое за первый месяц. Команда реально стала работать спокойнее.",
      name: "Elvin M.",
      role: "Head of IT, NovaTech",
    },
    {
      quote:
        "Переезд с legacy helpdesk занял меньше недели. Самое ценное — прозрачная аналитика и SLA-контроль.",
      name: "Nigar A.",
      role: "Operations Lead, Qala Group",
    },
    {
      quote:
        "Для нас критична изоляция данных между клиентами — тут это сделано правильно и предсказуемо.",
      name: "Rashad K.",
      role: "CTO, SignalOps",
    },
  ];

  const faqs = [
    {
      q: "Сколько времени занимает запуск?",
      a: "Обычно 1-2 часа для базовой конфигурации: организация, роли, категории и первые SLA.",
    },
    {
      q: "Можно ли использовать свой домен и SSO?",
      a: "Да. В Enterprise доступны custom domain и SSO (OIDC/SAML/LDAP).",
    },
    {
      q: "Есть ли миграция данных из старой системы?",
      a: "Да, можно импортировать пользователей/тикеты через API и кастомный скрипт импорта.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-cyan-300" />
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-2xl font-bold text-transparent">
              OnPoints.it ServiceDesk
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 hover:from-cyan-300 hover:to-sky-400">
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="absolute -right-24 top-12 h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="container mx-auto grid gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
              <Sparkles className="h-4 w-4" />
              Modern ITSM platform for fast-moving teams
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl font-bold leading-tight md:text-6xl">
                <span className="bg-gradient-to-r from-cyan-200 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  Service Desk
                </span>
                <br />
                <span className="text-slate-100">that feels modern</span>
              </h1>
              <p className="max-w-xl text-lg text-slate-300">
                Управляйте тикетами, SLA, командами и автоматизацией в одной системе.
                Быстро. Прозрачно. Без перегруза интерфейса.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="h-12 bg-gradient-to-r from-cyan-400 to-sky-500 px-7 text-base font-semibold text-slate-950 hover:from-cyan-300 hover:to-sky-400">
                  Start free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-300" />
                <span>4.8/5 team satisfaction</span>
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-600" />
              <span>No vendor lock-in</span>
            </div>

          </div>

          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_30px_80px_-40px_rgba(34,211,238,0.6)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <p className="text-sm font-medium text-slate-200">Operations Snapshot</p>
                <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-xs text-emerald-300">Live</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Open tickets", value: "142", tone: "text-cyan-300" },
                  { label: "SLA at risk", value: "08", tone: "text-amber-300" },
                  { label: "Avg first response", value: "17m", tone: "text-emerald-300" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
                    <span className="text-sm text-slate-300">{row.label}</span>
                    <span className={`text-lg font-semibold ${row.tone}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-400">Automation hits</p>
                  <p className="mt-1 text-xl font-bold text-slate-100">3,241</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <p className="text-xs text-slate-400">CSAT</p>
                  <p className="mt-1 text-xl font-bold text-slate-100">96%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="container mx-auto px-4 py-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-slate-400">Trusted by modern teams</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm text-slate-300 md:grid-cols-6">
            {trustedBy.map((brand) => (
              <div key={brand} className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-100 mb-4">
            Everything you need for IT support
          </h2>
          <p className="text-xl text-slate-300">
            Built for support teams that care about speed and quality
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Card key={index} className="border border-white/10 bg-white/5 hover:border-cyan-300/40 hover:bg-white/10 hover:shadow-[0_20px_50px_-30px_rgba(34,211,238,0.7)] transition-all duration-300">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-lg text-slate-100">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-300">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-bold text-slate-100">Teams love the clarity</h2>
          <p className="mt-3 text-lg text-slate-300">Real feedback from companies using ServiceDesk daily.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <Card key={item.name} className="border border-white/10 bg-white/5">
              <CardHeader>
                <MessageSquare className="h-5 w-5 text-cyan-300" />
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-200">&quot;{item.quote}&quot;</p>
                <div>
                  <p className="font-semibold text-slate-100">{item.name}</p>
                  <p className="text-sm text-slate-400">{item.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-bold text-slate-100">FAQ</h2>
          <p className="mt-3 text-lg text-slate-300">Коротко о главном перед запуском.</p>
        </div>
        <div className="mx-auto max-w-3xl space-y-3">
          {faqs.map((item) => (
            <div key={item.q} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                <Check className="h-4 w-4 text-cyan-300" />
                {item.q}
              </p>
              <p className="mt-2 text-slate-300">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="border border-cyan-300/20 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white shadow-2xl">
          <CardContent className="py-16 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Ready to start?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-slate-200">
              Create your organization in 2 minutes and get full access to the platform
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="h-14 border border-white/20 bg-white/90 px-8 text-lg text-slate-900 hover:bg-white">
                Create Organization Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/10 bg-slate-950/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-cyan-300" />
              <span className="font-semibold text-slate-200">OnPoints.it ServiceDesk</span>
            </div>
            <p className="text-sm text-slate-400">
              © 2025 ServiceDesk. Made with ❤️ for IT teams
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

