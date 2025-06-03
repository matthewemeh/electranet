const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_KEY, SUPABASE_STORAGE_URL } = process.env;

// Supabase client with service role key
const supabase = createClient(SUPABASE_STORAGE_URL, SUPABASE_KEY);

module.exports = supabase;
