"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Shield, 
  Zap, 
  Users, 
  BarChart3, 
  Clock, 
  Bell,
  FileText,
  ArrowRight,
  Building2,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const features = [
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: "Полная изоляция данных",
      description: "Multi-tenancy с PostgreSQL RLS обеспечивает 100% безопасность ваших данных"
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Автоматизация",
      description: "SLA политики, автоматическое назначение агентов и правила обработки тикетов"
    },
    {
      icon: <Users className="h-8 w-8 text-green-600" />,
      title: "Управление командой",
      description: "Гибкая система ролей и прав доступа для эффективной работы"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      title: "Аналитика в реальном времени",
      description: "Детальные отчёты и графики для принятия решений"
    },
    {
      icon: <Clock className="h-8 w-8 text-orange-600" />,
      title: "SLA мониторинг",
      description: "Отслеживание времени реакции и решения с визуальными индикаторами"
    },
    {
      icon: <Bell className="h-8 w-8 text-red-600" />,
      title: "Умные уведомления",
      description: "Группировка похожих уведомлений и гибкие настройки доставки"
    },
    {
      icon: <FileText className="h-8 w-8 text-indigo-600" />,
      title: "База знаний",
      description: "Создавайте статьи и документацию для быстрого решения типовых вопросов"
    },
    {
      icon: <Building2 className="h-8 w-8 text-cyan-600" />,
      title: "LDAP/Active Directory",
      description: "Интеграция с корпоративной инфраструктурой за 2 минуты"
    }
  ];

  const plans = [
    {
      name: "FREE",
      price: "0",
      period: "навсегда",
      description: "Для небольших команд",
      features: [
        "До 10 пользователей",
        "2 агента поддержки",
        "1GB хранилища",
        "100 тикетов/месяц",
        "Email поддержка"
      ],
      highlighted: false
    },
    {
      name: "PRO",
      price: "49",
      period: "в месяц",
      description: "Для растущих команд",
      features: [
        "До 50 пользователей",
        "15 агентов",
        "20GB хранилища",
        "Неограниченно тикетов",
        "SLA policies",
        "База знаний",
        "IT активы (CMDB)",
        "Приоритетная поддержка"
      ],
      highlighted: true
    },
    {
      name: "ENTERPRISE",
      price: "199",
      period: "в месяц",
      description: "Для крупных компаний",
      features: [
        "Неограниченно пользователей",
        "Неограниченно агентов",
        "Custom хранилище",
        "Все модули PRO +",
        "SSO (OIDC, SAML, LDAP)",
        "Кастомный домен",
        "API доступ",
        "24/7 VIP поддержка"
      ],
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              OnPoints.it ServiceDesk
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Войти</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Начать бесплатно
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            <Sparkles className="h-4 w-4" />
            Multi-tenant SaaS платформа для IT-поддержки
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Управляйте поддержкой
            </span>
            <br />
            <span className="text-slate-800">как профессионал</span>
          </h1>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Полнофункциональная система управления тикетами с multi-tenancy, SLA мониторингом, 
            автоматизацией и интеграцией с Active Directory
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 h-14">
                Создать организацию
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                Демо доступ
              </Button>
            </Link>
          </div>

          {/* Demo credentials hint */}
          <div className="pt-8 text-sm text-slate-500">
            <p>💡 Попробуйте демо: <span className="font-mono bg-slate-100 px-2 py-1 rounded">admin@demo.com</span> / <span className="font-mono bg-slate-100 px-2 py-1 rounded">admin123</span></p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Всё что нужно для IT-поддержки
          </h2>
          <p className="text-xl text-slate-600">
            Современная платформа с продвинутыми функциями из коробки
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20 bg-white/50 rounded-3xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Прозрачные тарифы
          </h2>
          <p className="text-xl text-slate-600">
            Выберите план, который подходит вашей команде
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${
                plan.highlighted 
                  ? 'border-4 border-blue-500 shadow-2xl scale-105' 
                  : 'border-2'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Популярный
                </div>
              )}
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold mb-2">{plan.name}</CardTitle>
                <div className="mb-2">
                  <span className="text-5xl font-bold">${plan.price}</span>
                  <span className="text-slate-600"> / {plan.period}</span>
                </div>
                <CardDescription className="text-base">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
                <Link href="/register" className="block">
                  <Button 
                    className={`w-full mt-6 ${
                      plan.highlighted 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
                        : ''
                    }`}
                    variant={plan.highlighted ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.name === "FREE" ? "Начать бесплатно" : "Выбрать план"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-2xl">
          <CardContent className="py-16 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Готовы начать?
            </h2>
            <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
              Создайте свою организацию за 2 минуты и получите полный доступ к платформе
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8 h-14">
                Создать организацию бесплатно
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-lg mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-slate-800">OnPoints.it ServiceDesk</span>
            </div>
            <p className="text-sm text-slate-600">
              © 2025 ServiceDesk. Сделано с ❤️ для IT команд
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

