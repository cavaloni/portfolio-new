'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Icons } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';
import { useUpdateProfile } from '@/hooks/use-auth';
import { toast } from '@/lib/toast';
import React from 'react';

// Form validation schema
const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  bio: z.string().max(160).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      website: user?.website || '',
      location: user?.location || '',
    },
    values: user ? {
      name: user.name || '',
      email: user.email,
      bio: user.bio || '',
      website: user.website || '',
      location: user.location || '',
    } : undefined,
  });
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
      });
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error({
        title: 'Invalid file type',
        description: 'Please upload an image file',
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // In a real app, you would upload the file to a storage service
      // and then update the user's avatar URL in the database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
      
      const avatarUrl = URL.createObjectURL(file);
      
// Get current form values to ensure we have name and email
      const currentValues = form.getValues();
      updateProfile(
        {
          name: currentValues.name,
          email: currentValues.email,
          avatar: avatarUrl
        },
        {
          onSuccess: () => {
            toast.success({
              title: 'Success',
              description: 'Your profile picture has been updated',
            });
          },
          onError: (error) => {
            console.error('Error updating avatar:', error);
            toast.error({
              title: 'Error',
              description: 'Failed to update profile picture',
            });
          },
        }
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error({
        title: 'Error',
        description: 'Failed to upload file',
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const onSubmit = (data: ProfileFormValues) => {
    updateProfile(data, {
      onSuccess: () => {
        toast.success({
          title: 'Success',
          description: 'Your profile has been updated',
        });
      },
      onError: (error) => {
        console.error('Error updating profile:', error);
        toast.error({
          title: 'Error',
          description: 'Failed to update profile',
        });
      },
    });
  };
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and profile information.
        </p>
      </div>
      
      <div className="space-y-8">
        {/* Profile Picture */}
        <div className="space-y-2">
          <Label>Profile Picture</Label>
          <div className="flex items-center space-x-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={user?.avatar_url || ''} alt={user?.name || 'User'} />
              <AvatarFallback>
                {user?.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex space-x-2">
                <div>
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isUploading || isPending}
                  />
                  <Label
                    htmlFor="avatar-upload"
                    className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                  >
                    {isUploading ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Change Avatar'
                    )}
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!user?.avatar_url || isUploading || isPending}
                  onClick={() => {
                    // In a real app, you would remove the avatar URL from the user's profile
                    // Get current form values to ensure we have name and email
                    const currentValues = form.getValues();
                    updateProfile(
                      {
                        name: currentValues.name,
                        email: currentValues.email,
                        avatar: undefined // Using undefined instead of null to match the expected type
                      },
                      {
                        onSuccess: () => {
                          toast.success({
                            title: 'Success',
                            description: 'Profile picture removed',
                          });
                        },
                      }
                    );
                  }}
                >
                  Remove
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                JPG, GIF or PNG. Max size of 2MB.
              </p>
            </div>
          </div>
        </div>
        
        {/* Profile Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                {...form.register('name')}
                disabled={isUploading || isPending}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                {...form.register('email')}
                disabled={isUploading || isPending}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a little bit about yourself"
                className="min-h-[100px]"
                {...form.register('bio')}
                disabled={isUploading || isPending}
              />
              {form.formState.errors.bio && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.bio.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                {...form.register('website')}
                disabled={isUploading || isPending}
              />
              {form.formState.errors.website && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.website.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Your location"
                {...form.register('location')}
                disabled={isUploading || isPending}
              />
              {form.formState.errors.location && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.location.message}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isUploading || isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || isPending}>
              {(isUploading || isPending) && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
