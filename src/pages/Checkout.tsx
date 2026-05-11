import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PawaPay } from '@/lib/pawapay';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShoppingCart } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import StorefrontPage from '@/components/StorefrontPage';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const navigate = useNavigate();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!orderId) {
      navigate('/orders');
      return;
    }
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        toast({ title: 'Error', description: 'Order not found', variant: 'destructive' });
        navigate('/orders');
        return;
      }

      if (data.status !== 'pending') {
        toast({ title: 'Info', description: 'This order has already been processed' });
        navigate(`/orders/${orderId}`);
        return;
      }

      setOrder(data);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load order', variant: 'destructive' });
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!phoneNumber) {
      toast({ title: 'Error', description: 'Please enter your phone number', variant: 'destructive' });
      return;
    }

    if (!orderId) return;

    setProcessing(true);
    try {
      const formattedPhone = PawaPay.formatPhoneNumber(phoneNumber);
      const result = await PawaPay.payOrder(orderId, formattedPhone);

      if (result.success) {
        toast({ title: 'Success', description: result.message || 'Payment initiated!' });
        toast({ title: 'Info', description: 'Check your phone to complete payment' });
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate(`/orders/${orderId}`);
        }, 3000);
      } else {
        toast({ title: 'Error', description: result.error || 'Payment failed', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <StorefrontPage>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </StorefrontPage>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <StorefrontPage>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Complete Payment</h1>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Order #{order.id.substring(0, 8)}
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium capitalize">{order.status}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-3">
              <span>Total:</span>
              <span className="text-green-600">{formatMoney(order.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Payment via Mobile Money</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <Input
                type="tel"
                placeholder="0977123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-12 rounded-2xl"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your mobile money number
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                You will receive a prompt on your phone to authorize the payment of{' '}
                <strong>{formatMoney(order.total_amount)}</strong>
              </p>
            </div>

            <Button
              onClick={handlePayment}
              disabled={processing || !phoneNumber}
              className="w-full h-12 rounded-2xl"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                `Pay ${formatMoney(order.total_amount)}`
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/orders')}
                disabled={processing}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </StorefrontPage>
  );
}
