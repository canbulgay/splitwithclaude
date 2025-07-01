import { Plus, Users, Receipt, CreditCard, TrendingUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Layout } from '../components/layout'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export function DashboardPage() {
  const { user } = useAuth()

  const stats = [
    {
      title: 'Total Groups',
      value: '3',
      description: 'Active groups',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'This Month',
      value: '$1,247.50',
      description: 'Total expenses',
      icon: Receipt,
      color: 'text-green-600'
    },
    {
      title: 'You Owe',
      value: '$234.75',
      description: 'Outstanding balance',
      icon: CreditCard,
      color: 'text-red-600'
    },
    {
      title: 'You Are Owed',
      value: '$87.25',
      description: 'Money to collect',
      icon: TrendingUp,
      color: 'text-emerald-600'
    }
  ]

  const recentExpenses = [
    { id: 1, description: 'Dinner at Mario\'s', amount: '$45.50', group: 'Friends', date: '2 hours ago' },
    { id: 2, description: 'Grocery shopping', amount: '$127.30', group: 'Roommates', date: '1 day ago' },
    { id: 3, description: 'Movie tickets', amount: '$28.00', group: 'Friends', date: '3 days ago' },
  ]

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name}! Here's your expense overview.
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>
                Your latest expense activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {expense.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {expense.group} • {expense.date}
                      </p>
                    </div>
                    <div className="font-medium">{expense.amount}</div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Expenses
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks to manage your expenses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                Create New Group
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Receipt className="h-4 w-4" />
                Add Expense
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <CreditCard className="h-4 w-4" />
                Settle Balance
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" />
                Invite Friends
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Balance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Balance Summary</CardTitle>
            <CardDescription>
              Overview of your financial status across all groups
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">$147.50</div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">$1,247.50</div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">$87.25</div>
                <p className="text-sm text-muted-foreground">Avg per Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}