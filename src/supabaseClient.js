import { createClient } from '@supabase/supabase-js'

// Use your Supabase project URL and anon/public key
const supabaseUrl = 'https://lpcfgukzgmwcwezllslv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwY2ZndWt6Z213Y3dlemxsc2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MTYyMDEsImV4cCI6MjA3NTQ5MjIwMX0.RUUMYIjCWK9PgsZxShBHYzW8YejhU6ueMYMFCyrgvKI' // Replace with your anon/public key

export const supabase = createClient(supabaseUrl, supabaseKey)
