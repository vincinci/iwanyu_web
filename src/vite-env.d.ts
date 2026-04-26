/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUPABASE_URL?: string;
	readonly VITE_SUPABASE_ANON_KEY?: string;
	readonly VITE_WEB_APP_URL?: string;
	readonly VITE_PUBLIC_WEB_URL?: string;
	readonly VITE_SITE_URL?: string;
	readonly VITE_FLUTTERWAVE_PUBLIC_KEY?: string;
	readonly VITE_CURRENCY?: string;
	readonly VITE_LOCALE?: string;
	readonly VITE_ADMIN_EMAILS?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
