import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PaymentCallbackPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/orders", { replace: true });
  }, [navigate]);
  return null;
}
