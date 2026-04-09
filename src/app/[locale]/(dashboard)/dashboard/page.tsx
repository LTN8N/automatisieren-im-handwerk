import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">
        Willkommen, {session?.user?.name}
      </h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Offene Angebote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Offene Rechnungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Kunden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Umsatz (Monat)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0,00 EUR</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
