-- FoodDeals Berlin Database Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/uopbkpxqslrnlnmsesif/sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial queries

-- =====================================================
-- USERS TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  language_preference TEXT DEFAULT 'en' CHECK (language_preference IN ('en', 'de')),
  xp_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  total_deals_posted INTEGER DEFAULT 0,
  total_money_saved DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_username CHECK (char_length(username) >= 3 AND char_length(username) <= 30)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- DEALS TABLE
-- =====================================================
CREATE TABLE public.deals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Deal information
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('happy_hour', 'student', 'lunch', 'early_bird', 'late_night', 'senior')),
  cuisine_type TEXT NOT NULL CHECK (cuisine_type IN ('italian', 'asian', 'german', 'mediterranean', 'american', 'vegetarian', 'vegan', 'fast_food', 'other')),

  -- Pricing
  original_price DECIMAL(10, 2) NOT NULL,
  deal_price DECIMAL(10, 2) NOT NULL,
  discount_percentage INTEGER GENERATED ALWAYS AS (
    ROUND(((original_price - deal_price) / original_price * 100)::numeric)
  ) STORED,

  -- Location
  restaurant_name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED,

  -- Media
  image_url TEXT,

  -- Engagement
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  vote_score INTEGER GENERATED ALWAYS AS (upvotes - downvotes) STORED,

  -- Validity
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_prices CHECK (deal_price < original_price AND deal_price > 0),
  CONSTRAINT valid_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180
  )
);

-- Create spatial index for location queries
CREATE INDEX deals_location_idx ON public.deals USING GIST (location);
CREATE INDEX deals_user_id_idx ON public.deals(user_id);
CREATE INDEX deals_created_at_idx ON public.deals(created_at DESC);
CREATE INDEX deals_deal_type_idx ON public.deals(deal_type);
CREATE INDEX deals_cuisine_type_idx ON public.deals(cuisine_type);

-- Enable RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Deals policies
CREATE POLICY "Deals are viewable by everyone"
  ON public.deals FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can create deals"
  ON public.deals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deals"
  ON public.deals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own deals"
  ON public.deals FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- VOTES TABLE
-- =====================================================
CREATE TABLE public.votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(deal_id, user_id) -- Prevent duplicate votes
);

CREATE INDEX votes_deal_id_idx ON public.votes(deal_id);
CREATE INDEX votes_user_id_idx ON public.votes(user_id);

-- Enable RLS
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Votes policies
CREATE POLICY "Votes are viewable by everyone"
  ON public.votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON public.votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.votes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- COMMENTS TABLE
-- =====================================================
CREATE TABLE public.comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_comment CHECK (char_length(content) >= 1 AND char_length(content) <= 1000)
);

CREATE INDEX comments_deal_id_idx ON public.comments(deal_id);
CREATE INDEX comments_created_at_idx ON public.comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- BADGES TABLE
-- =====================================================
CREATE TABLE public.badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  description TEXT NOT NULL,
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('deals_posted', 'money_saved', 'xp_earned', 'votes_received')),
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial badges
INSERT INTO public.badges (name, icon, description, requirement_type, requirement_value) VALUES
  ('First Deal', '🎯', 'Posted your first deal', 'deals_posted', 1),
  ('Deal Hunter', '🏹', 'Posted 10 deals', 'deals_posted', 10),
  ('Deal Master', '👑', 'Posted 50 deals', 'deals_posted', 50),
  ('Money Saver', '💰', 'Saved €100 for the community', 'money_saved', 100),
  ('Savings Hero', '🦸', 'Saved €1000 for the community', 'money_saved', 1000),
  ('Rising Star', '⭐', 'Earned 100 XP', 'xp_earned', 100),
  ('Community Leader', '🌟', 'Earned 1000 XP', 'xp_earned', 1000);

-- =====================================================
-- USER_BADGES TABLE (join table)
-- =====================================================
CREATE TABLE public.user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, badge_id)
);

CREATE INDEX user_badges_user_id_idx ON public.user_badges(user_id);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- User badges policies
CREATE POLICY "User badges are viewable by everyone"
  ON public.user_badges FOR SELECT
  USING (true);

-- =====================================================
-- FOOD_ALERTS TABLE
-- =====================================================
CREATE TABLE public.food_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cuisine_types TEXT[] NOT NULL,
  max_distance INTEGER DEFAULT 5000, -- in meters
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id) -- One alert config per user
);

-- Enable RLS
ALTER TABLE public.food_alerts ENABLE ROW LEVEL SECURITY;

-- Food alerts policies
CREATE POLICY "Users can view own alerts"
  ON public.food_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON public.food_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.food_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update vote counts on deals
CREATE OR REPLACE FUNCTION update_deal_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE public.deals SET upvotes = upvotes + 1 WHERE id = NEW.deal_id;
    ELSE
      UPDATE public.deals SET downvotes = downvotes + 1 WHERE id = NEW.deal_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 'up' AND NEW.vote_type = 'down' THEN
      UPDATE public.deals SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.deal_id;
    ELSIF OLD.vote_type = 'down' AND NEW.vote_type = 'up' THEN
      UPDATE public.deals SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = NEW.deal_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE public.deals SET upvotes = upvotes - 1 WHERE id = OLD.deal_id;
    ELSE
      UPDATE public.deals SET downvotes = downvotes - 1 WHERE id = OLD.deal_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for vote updates
CREATE TRIGGER on_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW EXECUTE FUNCTION update_deal_votes();

-- Function to update profile stats when deal is posted
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET
      total_deals_posted = total_deals_posted + 1,
      xp_points = xp_points + 10
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profile stats
CREATE TRIGGER on_deal_posted
  AFTER INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_profile_stats();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get deals within radius
CREATE OR REPLACE FUNCTION get_deals_near_location(
  lat DECIMAL,
  lon DECIMAL,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    ST_Distance(
      d.location,
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
    ) as distance_meters
  FROM public.deals d
  WHERE ST_DWithin(
    d.location,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    radius_meters
  )
  AND d.is_active = true
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
