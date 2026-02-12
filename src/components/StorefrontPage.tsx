import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";

export default function StorefrontPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className={cn("flex-1", className)}>{children}</main>
      <Footer />
    </div>
  );
}
