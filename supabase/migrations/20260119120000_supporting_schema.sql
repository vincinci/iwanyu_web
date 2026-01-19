-- Enable variants and multiple images
-- Created for full Shopify Import compatibility

CREATE TABLE IF NOT EXISTS public.product_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    title text NOT NULL DEFAULT 'Default Title',
    sku text,
    price_rwf integer,
    compare_at_price_rwf integer,
    inventory_quantity integer DEFAULT 0,
    option1_name text,
    option1_value text,
    option2_name text,
    option2_value text,
    option3_name text,
    option3_value text,
    barcode text,
    image_url text, -- Variant specific image
    weight real,
    weight_unit text DEFAULT 'kg',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    url text NOT NULL,
    position integer DEFAULT 0,
    alt_text text,
    width integer,
    height integer,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for admin import access, assuming standard admin helpers exist)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public read variants" ON public.product_variants;
    CREATE POLICY "Public read variants" ON public.product_variants FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Admin full access variants" ON public.product_variants;
    CREATE POLICY "Admin full access variants" ON public.product_variants FOR ALL USING (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Public read images" ON public.product_images;
    CREATE POLICY "Public read images" ON public.product_images FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admin full access images" ON public.product_images;
    CREATE POLICY "Admin full access images" ON public.product_images FOR ALL USING (public.is_admin(auth.uid()));
END $$;
