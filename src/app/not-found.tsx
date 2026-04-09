import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="mb-4 text-4xl font-bold">404</h1>
      <p className="mb-6 text-zinc-600">Seite nicht gefunden</p>
      <Link
        href="/de"
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
      >
        Zur Startseite
      </Link>
    </div>
  );
}
