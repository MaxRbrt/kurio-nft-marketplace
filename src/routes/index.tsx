import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <h1 className="text-2xl font-medium">KURIO</h1>
    </main>
  );
}
