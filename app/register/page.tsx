import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <RegisterForm next={next && next.startsWith("/") ? next : "/"} />
    </main>
  );
}
