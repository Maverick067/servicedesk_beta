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
      icon: <FileText className="h-8 w-8 text-indigo-600" />,
      title: "Knowledge Base",
      description: "Create articles and documentation for quick resolution of common questions"
    },
    {
      icon: <Building2 className="h-8 w-8 text-cyan-600" />,
      title: "LDAP/Active Directory",
      description: "Integration with corporate infrastructure in 2 minutes"
    }
  ];

  const plans = [
    {
      name: "FREE",
      price: "0",
      period: "forever",
      description: "For small teams",
      features: [
        "Up to 10 users",
        "2 support agents",
        "1GB storage",
        "100 tickets/month",
        "Email support"
      ],
      highlighted: false
    },
    {
      name: "PRO",
      price: "49",
      period: "per month",
      description: "For growing teams",
      features: [
        "Up to 50 users",
        "15 agents",
        "20GB storage",
        "Unlimited tickets",
        "SLA policies",
        "Knowledge Base",
        "IT Assets (CMDB)",
        "Priority support"
      ],
      highlighted: true
    },
    {
      name: "ENTERPRISE",
      price: "199",
      period: "per month",
      description: "For large companies",
      features: [
        "Unlimited users",
        "Unlimited agents",
        "Custom storage",
        "All PRO modules +",
        "SSO (OIDC, SAML, LDAP)",
        "Custom domain",
        "API access",
        "24/7 VIP support"
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
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Start Free
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
            Multi-tenant SaaS platform for IT support
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Manage support
            </span>
            <br />
            <span className="text-slate-800">like a professional</span>
          </h1>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Full-featured ticket management system with multi-tenancy, SLA monitoring, 
            automation and Active Directory integration
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 h-14">
                Create Organization
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                Demo Access
              </Button>
            </Link>
          </div>

          {/* Demo credentials hint */}
          <div className="pt-8 text-sm text-slate-500">
            <p>💡 Try demo: <span className="font-mono bg-slate-100 px-2 py-1 rounded">admin@demo.com</span> / <span className="font-mono bg-slate-100 px-2 py-1 rounded">admin123</span></p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Everything you need for IT support
          </h2>
          <p className="text-xl text-slate-600">
            Modern platform with advanced features out of the box
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
            Transparent Pricing
          </h2>
          <p className="text-xl text-slate-600">
            Choose the plan that fits your team
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
                  Popular
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
                    {plan.name === "FREE" ? "Start Free" : "Choose Plan"}
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
              Ready to start?
            </h2>
            <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
              Create your organization in 2 minutes and get full access to the platform
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8 h-14">
                Create Organization Free
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
              © 2025 ServiceDesk. Made with ❤️ for IT teams
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

