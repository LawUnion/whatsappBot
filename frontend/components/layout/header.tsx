'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Admin } from '@/lib/types';

interface HeaderProps {
  admin: Admin | null;
  isImpersonating?: boolean;
  onStopImpersonation?: () => void;
}

export function Header({ admin, isImpersonating, onStopImpersonation }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordDialog(false);
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess(false);
      }, 1500);
    }
  };

  return (
    <>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-amber-500 text-amber-950 py-2 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">👁️</span>
            <span className="font-medium text-sm">
              You are viewing as <strong>{admin?.name}</strong> ({admin?.role.replace('_', ' ')})
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onStopImpersonation}
            className="bg-white/20 border-amber-700 text-amber-950 hover:bg-white/30"
          >
            Stop Viewing
          </Button>
        </div>
      )}

      {/* Main Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-medium text-slate-600">
            {getGreeting()}, <span className="text-slate-900 font-semibold">{admin?.name?.split(' ')[0] || 'Admin'}</span>
          </h2>
          {admin?.college && (
            <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md text-xs font-medium">
              {admin.college.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* User Menu */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{admin?.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{admin?.role.replace(/_/g, ' ')}</p>
            </div>
            <Avatar className="h-9 w-9 bg-slate-900 ring-2 ring-slate-100">
              <AvatarFallback className="bg-transparent text-white font-medium text-sm">
                {admin?.name?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowPasswordDialog(true);
                setNewPassword('');
                setConfirmPassword('');
                setPasswordError('');
                setPasswordSuccess(false);
              }}
              className="text-slate-500 hover:text-slate-700"
            >
              Change Password
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-500 hover:text-slate-700"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => !open && setShowPasswordDialog(false)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          {passwordSuccess ? (
            <div className="py-6 text-center">
              <div className="text-3xl mb-2">&#10003;</div>
              <p className="text-sm text-emerald-600 font-medium">Password updated successfully!</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
