const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://ttyezboapfpyvlyxiqjw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWV6Ym9hcGZweXZseXhpcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTQ3NzIsImV4cCI6MjA3MzAzMDc3Mn0.BX8WjVExYR0W5NhMGLumIaoYh4dvD2bl_ItZVQIWTfE';

async function checkExistingUser() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check the auth user
    console.log('Checking auth user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'realuser@gmail.com',
      password: 'Password123'
    });

    if (authError) {
      console.error('Auth error:', authError);
    } else {
      console.log('Auth successful:', authData.user?.email, 'Email confirmed:', !!authData.user?.email_confirmed_at);
    }

    // Check database user
    console.log('\nChecking database user...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'realuser@gmail.com')
      .single();

    if (dbError && dbError.code !== 'PGRST116') {
      console.error('Database error:', dbError);
    } else if (dbUser) {
      console.log('Database user exists:', dbUser);
    } else {
      console.log('Database user does not exist');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkExistingUser();