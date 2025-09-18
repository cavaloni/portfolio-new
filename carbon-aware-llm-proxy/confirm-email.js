const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://ttyezboapfpyvlyxiqjw.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWV6Ym9hcGZweXZseXhpcWp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ1NDc3MiwiZXhwIjoyMDczMDMwNzcyfQ.example';

async function confirmUserEmail() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    console.log('Attempting to confirm user email for testuser@gmail.com...');

    // List users to find the test user
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const testUser = users.users.find(user => user.email === 'testuser@gmail.com');

    if (!testUser) {
      console.log('Test user not found');
      return;
    }

    console.log('Found user:', testUser.email, 'ID:', testUser.id, 'Confirmed:', !!testUser.email_confirmed_at);

    // Update user to confirm email
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      testUser.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('Error confirming email:', updateError);
    } else {
      console.log('Email confirmed successfully for user:', testUser.email);
    }

    // Test login after confirmation
    console.log('\nTesting login after confirmation...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'testuser@gmail.com',
      password: 'Password123'
    });

    if (loginError) {
      console.error('Login still failed:', loginError);
    } else {
      console.log('Login successful after email confirmation!');
      console.log('User email confirmed:', !!loginData.user.email_confirmed_at);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

confirmUserEmail();