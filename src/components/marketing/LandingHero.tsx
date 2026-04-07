'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  FileText,
  Users,
  ShieldCheck,
  TrendingUp,
  GitBranch,
  Layers,
} from 'lucide-react'

const stats = [
  { label: 'Active pipeline companies', value: '120+' },
  { label: 'Weekly approvals processed', value: '45' },
  { label: 'Documents centralized', value: '8,400+' },
]

const supportCards = [
  {
    icon: <BarChart3 className="text-primary size-5" />,
    title: 'Pipeline visibility',
    copy: 'Stage shifts, rationales, and approvals surfaced in one board.',
  },
  {
    icon: <FileText className="text-primary size-5" />,
    title: 'Document intelligence',
    copy: 'Auto-tagged memos and attachments stay tied to every request.',
  },
  {
    icon: <Users className="text-primary size-5" />,
    title: 'Role-aware flow',
    copy: 'Primary, secondary, and lead investors approve in order, automatically.',
  },
]

const workflowSteps = [
  {
    icon: <TrendingUp className="text-primary size-5" />,
    title: 'Source & triage',
    copy: 'Import coverage lists, auto-tag analysts, and prioritize quickly.',
  },
  {
    icon: <GitBranch className="text-primary size-5" />,
    title: 'Collaborate & document',
    copy: 'Draft memos, attach diligence, and keep context in one place.',
  },
  {
    icon: <ShieldCheck className="text-primary size-5" />,
    title: 'Approve & monitor',
    copy: 'Sequenced approvals, alerts, and reactivation badges keep governance tight.',
  },
]

export function LandingHero() {
  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto flex min-h-screen items-center justify-center px-6 py-0">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-5 text-center">
            <div className="border-border/70 inline-flex flex-col items-center gap-1 rounded-full border bg-white/95 px-6 py-3 text-center shadow-sm">
              <span className="text-muted-foreground text-[10px] tracking-[0.4em] uppercase">
                Arnie
              </span>
              <span className="text-foreground text-sm font-semibold">
                Research Management System
              </span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Modern research management, rebuilt.
              </h1>
              <p className="text-muted-foreground text-lg">
                Live pipeline tracking, approvals, and documentation—all tailored to the Arnie
                investing cadence.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-background/70 rounded-xl border px-4 py-3">
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-2xl border bg-white/90 p-6 shadow-sm">
              <div className="space-y-1 text-center">
                <p className="text-primary text-xs font-semibold tracking-wide uppercase">
                  Platform pillars
                </p>
                <p className="text-foreground text-lg font-semibold">
                  Every transition, memo, and approval in one command center.
                </p>
              </div>
              <div className="grid gap-4">
                {supportCards.map((card) => (
                  <div key={card.title} className="bg-card/40 flex gap-3 rounded-xl border p-4">
                    <div className="bg-primary/10 flex size-11 items-center justify-center rounded-lg">
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{card.title}</p>
                      <p className="text-muted-foreground text-xs">{card.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 rounded-2xl border bg-white/90 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Layers className="bg-primary/10 text-primary size-9 rounded-full p-2" />
                <div>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Workflow snapshot
                  </p>
                  <p className="text-sm font-semibold">How RMS keeps teams in sync</p>
                </div>
              </div>
              <div className="space-y-3">
                {workflowSteps.map((step) => (
                  <div key={step.title} className="flex gap-3 text-sm">
                    <div className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
                      {step.icon}
                    </div>
                    <div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-muted-foreground text-xs">{step.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
