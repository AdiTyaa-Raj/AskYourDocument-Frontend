import { ArrowDownRight, ArrowUpRight, DollarSign, PieChart, Plus, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'

const HOLDINGS = [
  {
    name: 'TechCo Inc.',
    sector: 'Technology',
    investment: '$385K',
    value: '$480K',
    return: '+$95K',
    change: '+24.8%',
    positive: true,
  },
  {
    name: 'HealthPlus',
    sector: 'Healthcare',
    investment: '$300K',
    value: '$325K',
    return: '+$25K',
    change: '+8.3%',
    positive: true,
  },
  {
    name: 'GreenEnergy Co.',
    sector: 'Clean Energy',
    investment: '$295K',
    value: '$290K',
    return: '-$5K',
    change: '-1.7%',
    positive: false,
  },
  {
    name: 'FinanceHub',
    sector: 'Fintech',
    investment: '$240K',
    value: '$265K',
    return: '+$25K',
    change: '+10.4%',
    positive: true,
  },
  {
    name: 'EduTech Solutions',
    sector: 'Education',
    investment: '$170K',
    value: '$180K',
    return: '+$10K',
    change: '+5.9%',
    positive: true,
  },
  {
    name: 'LogiTech Global',
    sector: 'Logistics',
    investment: '$195K',
    value: '$185K',
    return: '-$10K',
    change: '-5.1%',
    positive: false,
  },
  {
    name: 'FoodChain Inc.',
    sector: 'Food & Bev',
    investment: '$150K',
    value: '$165K',
    return: '+$15K',
    change: '+10.0%',
    positive: true,
  },
] as const

export function PortfolioContainer() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track and manage your investment positions
          </p>
        </div>
        <Button>
          <Plus className="size-4" />
          Add Position
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-lg border p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-muted-foreground text-sm font-medium">Total Value</div>
            <DollarSign className="text-muted-foreground size-4" />
          </div>
          <div className="mb-2 text-3xl font-bold">$2,450,000</div>
          <div className="text-accent flex items-center gap-1 text-sm">
            <ArrowUpRight className="size-3" />
            <span className="font-medium">+12.5%</span>
            <span className="text-muted-foreground">overall</span>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-muted-foreground text-sm font-medium">Total Gain/Loss</div>
            <TrendingUp className="text-muted-foreground size-4" />
          </div>
          <div className="text-accent mb-2 text-3xl font-bold">+$270K</div>
          <div className="text-muted-foreground text-sm">Since inception</div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-muted-foreground text-sm font-medium">Active Positions</div>
            <PieChart className="text-muted-foreground size-4" />
          </div>
          <div className="mb-2 text-3xl font-bold">23</div>
          <div className="text-muted-foreground text-sm">Across 6 sectors</div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-muted-foreground text-sm font-medium">Best Performer</div>
            <TrendingUp className="text-muted-foreground size-4" />
          </div>
          <div className="mb-2 text-xl font-bold">TechCo Inc.</div>
          <div className="text-accent flex items-center gap-1 text-sm">
            <ArrowUpRight className="size-3" />
            <span className="font-medium">+24.8%</span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">Holdings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-muted-foreground px-6 py-3 text-left text-sm font-medium">
                  Company
                </th>
                <th className="text-muted-foreground px-6 py-3 text-left text-sm font-medium">
                  Sector
                </th>
                <th className="text-muted-foreground px-6 py-3 text-right text-sm font-medium">
                  Investment
                </th>
                <th className="text-muted-foreground px-6 py-3 text-right text-sm font-medium">
                  Current Value
                </th>
                <th className="text-muted-foreground px-6 py-3 text-right text-sm font-medium">
                  Return
                </th>
                <th className="text-muted-foreground px-6 py-3 text-right text-sm font-medium">
                  % Change
                </th>
              </tr>
            </thead>
            <tbody>
              {HOLDINGS.map((holding) => (
                <tr key={holding.name} className="hover:bg-muted/30 border-b transition-colors">
                  <td className="text-foreground px-6 py-3 text-sm font-medium">{holding.name}</td>
                  <td className="text-muted-foreground px-6 py-3 text-sm">{holding.sector}</td>
                  <td className="text-muted-foreground px-6 py-3 text-right text-sm">
                    {holding.investment}
                  </td>
                  <td className="text-muted-foreground px-6 py-3 text-right text-sm">
                    {holding.value}
                  </td>
                  <td
                    className={`px-6 py-3 text-right text-sm font-medium ${
                      holding.positive ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {holding.return}
                  </td>
                  <td className="px-6 py-3 text-right text-sm">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        holding.positive ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {holding.positive ? (
                        <ArrowUpRight className="size-3" />
                      ) : (
                        <ArrowDownRight className="size-3" />
                      )}
                      {holding.change}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
