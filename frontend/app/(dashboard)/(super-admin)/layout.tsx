import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: admin } = await supabase
    .from('admins')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!admin || admin.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  return <>{children}</>;
}
