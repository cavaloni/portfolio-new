import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ttyezboapfpyvlyxiqjw.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWV6Ym9hcGZweXZseXhpcWp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NTQ3NzIsImV4cCI6MjA3MzAzMDc3Mn0.BX8WjVExYR0W5NhMGLumIaoYh4dvD2bl_ItZVQIWTfE';

async function checkSchema() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Testing Supabase connection...');

    // Try to get the schema information
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error querying users table:', error);
      return;
    }

    console.log('Users table exists. Testing insert...');

    // Try to insert a test user to see what columns are required
    const testUser = {
      email: 'test@example.com',
      password_hash: 'hashed_password',
      name: 'Test User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert(testUser)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      console.log('This shows what columns are missing or what the actual schema is');
    } else {
      console.log('Test user created successfully:', insertData);

      // Clean up
      await supabase
        .from('users')
        .delete()
        .eq('email', 'test@example.com');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSchema();