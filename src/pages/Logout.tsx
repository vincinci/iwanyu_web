import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { useAuth } from "@/context/auth";

export default function LogoutPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleSignOut() {
      await signOut();
      navigate("/", { replace: true });
    }
    void handleSignOut();
  }, [navigate, signOut]);

  return (
    <StorefrontPage>
      <div className="container py-10">
        <div className="text-sm text-gray-600">Signing you out…</div>
      </div>
    </StorefrontPage>
  );
}
