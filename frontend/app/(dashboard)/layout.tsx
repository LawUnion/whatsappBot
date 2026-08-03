import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import type { Admin } from '@/lib/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('Auth error or no user:', authError?.message);
    redirect('/login');
  }

  console.log('Authenticated user ID:', user.id);

  // Fetch admin data with college info
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select(`
      *,
      college:colleges(*),
      year:years(*),
      section:sections(*)
    `)
    .eq('id', user.id)
    .single();

  console.log('Admin fetch result:', { admin, error: adminError?.message });

  // If no admin record or admin is revoked, show error
  if (!admin || !admin.active) {
    const isRevoked = admin && !admin.active;
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-xl">
          <div className="text-5xl mb-4">{isRevoked ? '🚫' : '⚠️'}</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {isRevoked ? 'Access Revoked' : 'Admin Access Required'}
          </h1>
          <p className="text-slate-500 mb-4">
            {isRevoked
              ? 'Your admin access has been revoked. Please contact a Super Admin to restore access.'
              : <>You are logged in as <strong>{user.email}</strong>, but no admin record was found.</>
            }
          </p>
          {!isRevoked && (
            <>
              <p className="text-sm text-slate-400 mb-6">
                User ID: <code className="bg-slate-100 px-2 py-1 rounded">{user.id}</code>
              </p>
              <p className="text-sm text-slate-500">
                Ask a Super Admin to add you to the admins table.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar admin={admin as Admin} />
      
      <div className="ml-64 transition-all duration-300">
        <Header admin={admin as Admin} />
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
