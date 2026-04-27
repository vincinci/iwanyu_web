-- Force-end all stuck live sessions
UPDATE public.auctions SET is_live = false WHERE is_live = true;
