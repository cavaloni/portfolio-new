'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { useResetPassword } from '@/hooks/use-auth';
import { toast } from '@/lib/toast';

type ResetPasswordFormData = {
  password: string;
  confirmPassword: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: '',
    confirmPassword: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { mutate: resetPassword, isPending } = useResetPassword();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error({
        title: 'Error',
        description: 'Invalid or missing reset token',
      });
      return;
    }
    
    if (!formData.password || !formData.confirmPassword) {
      toast.error({
        title: 'Error',
        description: 'Please fill in all fields',
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error({
        title: 'Error',
        description: 'Passwords do not match',
      });
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error({
        title: 'Error',
        description: 'Password must be at least 8 characters long',
      });
      return;
    }
    
    resetPassword(
      { token, newPassword: formData.password },
      {
        onSuccess: () => {
          setIsSubmitted(true);
          toast.success({
            title: 'Success',
            description: 'Your password has been reset successfully',
          });
          // Redirect to login after a short delay
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        },
        onError: (error) => {
          console.error('Password reset error:', error);
          toast.error({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Failed to reset password',
          });
        },
      }
    );
  };
  
  if (isSubmitted) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Icons.checkCircle className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Password Reset Successful</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your password has been updated successfully.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please enter your new password below.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            disabled={isPending}
            required
          />
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters long
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isPending}
            required
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Reset Password
        </Button>
      </form>
      
      <div className="text-center text-sm">
        <Link 
          href="/login" 
          className="font-medium text-primary hover:underline"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
