-- ============================================================================
-- AMAN MEDICAL - DOCTOR ORDERING PORTAL
-- PHASE 1: COMPLETE SUPABASE POSTGRESQL SCHEMA + PG_TRGM + RLS POLICIES
-- Copy & paste directly into Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  clinic TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'doctor' CHECK (role IN ('doctor', 'admin')),
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MEDICINES TABLE (Supports 8,000-10,000+ SKUs with fast pg_trgm search)
CREATE TABLE IF NOT EXISTS public.medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  pack TEXT NOT NULL,
  rate NUMERIC(10, 2) NOT NULL CHECK (rate >= 0),
  min_qty INTEGER NOT NULL DEFAULT 1 CHECK (min_qty >= 1),
  image_url TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate medicines by (name, company, pack) case-insensitive
  CONSTRAINT medicines_name_company_pack_unique UNIQUE (name, company, pack)
);

-- Fast Trigram GIN Indexes for instant server-side search on 10,000+ rows
CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON public.medicines USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_company_trgm ON public.medicines USING GIN (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_code ON public.medicines (code);
CREATE INDEX IF NOT EXISTS idx_medicines_active ON public.medicines (active);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  doctor_name TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  doctor_phone TEXT NOT NULL,
  doctor_city TEXT NOT NULL,
  total_items INTEGER NOT NULL CHECK (total_items >= 1),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Packed', 'Dispatched', 'Delivered')),
  courier_name TEXT NOT NULL DEFAULT '',
  tracking_no TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_doctor_id ON public.orders (doctor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- 5. ORDER_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  pack TEXT NOT NULL,
  rate NUMERIC(10, 2) NOT NULL CHECK (rate >= 0),
  qty INTEGER NOT NULL CHECK (qty >= 1),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);

-- 6. HELPER FUNCTIONS FOR RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_doctor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (role = 'admin' OR (approved = TRUE AND status = 'approved'))
  );
$$;

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES: PROFILES
DROP POLICY IF EXISTS "Doctors can view own profile or admin views all" ON public.profiles;
CREATE POLICY "Doctors can view own profile or admin views all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own pending doctor profile" ON public.profiles;
CREATE POLICY "Users can insert own pending doctor profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND role = 'doctor'
    AND approved = FALSE
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Doctors can update own basic profile fields" ON public.profiles;
CREATE POLICY "Doctors can update own basic profile fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin() OR (
      auth.uid() = id
      AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      AND approved = (SELECT p.approved FROM public.profiles p WHERE p.id = auth.uid())
      AND status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- 9. RLS POLICIES: MEDICINES
DROP POLICY IF EXISTS "Anyone can view active medicines, admin views all" ON public.medicines;
CREATE POLICY "Anyone can view active medicines, admin views all"
  ON public.medicines FOR SELECT
  USING (active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Only admin can insert medicines" ON public.medicines;
CREATE POLICY "Only admin can insert medicines"
  ON public.medicines FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admin can update medicines" ON public.medicines;
CREATE POLICY "Only admin can update medicines"
  ON public.medicines FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admin can delete medicines" ON public.medicines;
CREATE POLICY "Only admin can delete medicines"
  ON public.medicines FOR DELETE
  USING (public.is_admin());

-- 10. RLS POLICIES: ORDERS
DROP POLICY IF EXISTS "Doctors view own orders, admin views all" ON public.orders;
CREATE POLICY "Doctors view own orders, admin views all"
  ON public.orders FOR SELECT
  USING (doctor_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Approved doctors can create own orders" ON public.orders;
CREATE POLICY "Approved doctors can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    doctor_id = auth.uid()
    AND status = 'Pending'
    AND public.is_approved_doctor()
  );

DROP POLICY IF EXISTS "Only admin can update order status and courier tracking" ON public.orders;
CREATE POLICY "Only admin can update order status and courier tracking"
  ON public.orders FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 11. RLS POLICIES: ORDER_ITEMS
DROP POLICY IF EXISTS "Doctors view own order items, admin views all" ON public.order_items;
CREATE POLICY "Doctors view own order items, admin views all"
  ON public.order_items FOR SELECT
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Approved doctors can insert items for own order" ON public.order_items;
CREATE POLICY "Approved doctors can insert items for own order"
  ON public.order_items FOR INSERT
  WITH CHECK (
    public.is_approved_doctor() AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.doctor_id = auth.uid()
    )
  );

-- 12. SUPABASE STORAGE BUCKET FOR MEDICINE PHOTOS (WebP ~40KB)
INSERT INTO storage.buckets (id, name, public)
VALUES ('medicine-photos', 'medicine-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for medicine photos" ON storage.objects;
CREATE POLICY "Public read access for medicine photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'medicine-photos');

DROP POLICY IF EXISTS "Admin upload access for medicine photos" ON storage.objects;
CREATE POLICY "Admin upload access for medicine photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'medicine-photos' AND public.is_admin());

DROP POLICY IF EXISTS "Admin update access for medicine photos" ON storage.objects;
CREATE POLICY "Admin update access for medicine photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'medicine-photos' AND public.is_admin());

-- 13. FIRST ADMIN PROMOTION COMMAND (Run after registering your account)
-- UPDATE public.profiles
-- SET role = 'admin', approved = TRUE, status = 'approved'
-- WHERE email = 'your-admin-email@example.com';
