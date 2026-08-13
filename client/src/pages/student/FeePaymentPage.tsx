import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Receipt, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Invoice {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'var(--warning-main)',
  PAID: 'var(--success-main)',
  OVERDUE: 'var(--error-main)',
  CANCELLED: 'var(--text-secondary)'
};

export default function FeePaymentPage() {
  const qc = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: () => api.get('/payments/invoices').then((res) => res.data.data as Invoice[]),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => api.post(`/payments/invoices/${id}/pay`),
    onSuccess: (res) => {
      const { paymentId, orderId, amount, currency } = res.data.data;
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        name: 'SmartHostel',
        description: 'Fee Payment',
        order_id: orderId,
        handler: async function (response: any) {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.success('Payment successful!');
            qc.invalidateQueries({ queryKey: ['my-invoices'] });
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: 'Student Name',
          email: 'student@example.com',
          contact: '9999999999'
        },
        theme: {
          color: '#3f51b5'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
    },
    onSettled: () => setProcessingId(null)
  });

  const handlePay = (invoice: Invoice) => {
    setProcessingId(invoice.id);
    payMutation.mutate(invoice.id);
  };

  return (
    <DashboardLayout title="Fee Payments">
      <div className="page" style={{ padding: '24px 20px', maxWidth: 1000, margin: '0 auto' }}>
        
        <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
          <div className="stat-card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255, 152, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={24} color="var(--warning-main)" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>Pending Dues</p>
              <h3 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700 }}>
                ₹{invoices?.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE').reduce((acc, i) => acc + i.amount, 0) || 0}
              </h3>
            </div>
          </div>
          <div className="stat-card" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(76, 175, 80, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={24} color="var(--success-main)" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>Total Paid</p>
              <h3 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700 }}>
                ₹{invoices?.filter(i => i.status === 'PAID').reduce((acc, i) => acc + i.amount, 0) || 0}
              </h3>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={20} />
            My Invoices
          </h2>

          {isLoading ? (
            <p>Loading invoices...</p>
          ) : invoices?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
              <CheckCircle size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p>You have no invoices. You're all caught up!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {invoices?.map(invoice => (
                <div key={invoice.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  borderRadius: 12,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-surface)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 16 }}>{invoice.type.replace('_', ' ')}</h3>
                      <span style={{ 
                        fontSize: 12, 
                        fontWeight: 600, 
                        padding: '2px 8px', 
                        borderRadius: 100, 
                        color: statusColors[invoice.status],
                        backgroundColor: `${statusColors[invoice.status]}15`
                      }}>
                        {invoice.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>
                      {invoice.description || 'Hostel Fee'} • Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>₹{invoice.amount}</h3>
                    {(invoice.status === 'PENDING' || invoice.status === 'OVERDUE') && (
                      <button 
                        className="btn-primary" 
                        onClick={() => handlePay(invoice)}
                        disabled={processingId === invoice.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100, justifyContent: 'center' }}
                      >
                        {processingId === invoice.id ? 'Processing...' : (
                          <>
                            <CreditCard size={18} />
                            Pay Now
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
