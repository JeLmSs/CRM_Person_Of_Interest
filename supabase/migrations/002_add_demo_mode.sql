-- Add demo mode support to profiles table
-- Allows users to toggle between real data and dynamically-generated demo data

ALTER TABLE public.profiles
ADD COLUMN demo_mode boolean DEFAULT false,
ADD COLUMN demo_seed bigint;

-- Create index for faster demo_mode lookups
CREATE INDEX idx_profiles_demo_mode ON public.profiles(id, demo_mode);
