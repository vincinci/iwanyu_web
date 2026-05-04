import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function WalletCallbackPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/wallet", { replace: true });
  }, [navigate]);
  return null;
}
