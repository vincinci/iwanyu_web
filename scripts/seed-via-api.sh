#!/bin/bash
# Seed database using Supabase REST API
# This script uses the anon key with proper RLS bypassing through service role

set -e

SUPABASE_URL="https://ygpnvjfxxuabnrpvnfdq.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NTcyMjMsImV4cCI6MjA1MjUzMzIyM30.hNxQH_sOSuVE4lCMHEqJNdvE23VEgC_wQxFuU_mDDjQ"

echo "🌱 Seeding database via REST API..."
echo ""

# Note: This will only work if RLS policies allow inserts
# You may need to temporarily disable RLS or use service role key
# For production, use the Supabase SQL Editor with the seed.sql file

echo "⚠️  This script requires manual setup."
echo "Please use one of these methods instead:"
echo ""
echo "1. Visit: https://www.iwanyu.store/seed.html"
echo "   Copy the SQL and run it in Supabase SQL Editor"
echo ""
echo "2. Go to: https://supabase.com/dashboard/project/ygpnvjfxxuabnrpvnfdq/sql/new"
echo "   Paste the contents of supabase/seed.sql"
echo ""
echo "3. Contact admin to add SUPABASE_SERVICE_ROLE_KEY to Vercel"
echo "   Then call: POST https://www.iwanyu.store/api/seed-database"
