import Link from 'next/link';

export function DepositHeaderActions({ userId }: { userId?: string | null }) {
  if (!userId) {
    return null;
  }

  return (
    <Link href={`/users/${userId}`} className="text-primary text-sm hover:underline">
      Open user
    </Link>
  );
}
