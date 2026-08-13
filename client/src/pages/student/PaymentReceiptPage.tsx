import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer, ArrowLeft, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';

export default function PaymentReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: receipt, isLoading, isError } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => api.get(`/payments/invoices/${id}/receipt`).then(r => r.data.data),
    enabled: !!id
  });

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <DashboardLayout title="Payment Receipt">
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading receipt...</div>
      </DashboardLayout>
    );
  }

  if (isError || !receipt) {
    return (
      <DashboardLayout title="Payment Receipt">
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--error-main)' }}>Receipt not found or invoice is not paid yet.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Payment Receipt">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .receipt-box { box-shadow: none !important; border: 1px solid #ccc !important; max-width: 100% !important; }
        }
      `}</style>

      <div style={{ padding: '24px 20px', maxWidth: 720, margin: '0 auto' }}>
        {/* Actions */}
        <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button className="btn-secondary" onClick={() => navigate('/student/fees')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowLeft size={16} /> Back to Fees
          </button>
          <button className="btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={16} /> Print / Download PDF
          </button>
        </div>

        {/* Receipt Box */}
        <div className="receipt-box card" style={{ padding: '40px 48px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid var(--border-color)' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary-light)' }}>SmartHostel</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Payment Receipt</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 4 }}>
                <CheckCircle size={20} color="var(--success-main)" />
                <span style={{ fontWeight: 700, color: 'var(--success-main)', fontSize: 18 }}>PAID</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{receipt.receiptNumber}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {receipt.paidAt ? new Date(receipt.paidAt).toLocaleString() : '-'}
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>Billed To</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{receipt.student?.name || 'Student'}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{receipt.email}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Roll No: {receipt.student?.rollNumber}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Room: {receipt.student?.roomNumber || 'N/A'}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{receipt.student?.department}, Year {receipt.student?.year}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>Payment Details</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Method: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{receipt.method}</span></div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Transaction ID:</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', marginTop: 2, wordBreak: 'break-all' }}>{receipt.transactionId || 'N/A'}</div>
            </div>
          </div>

          {/* Invoice Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Description</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Type</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px 16px', fontSize: 14 }}>{receipt.description || 'Hostel Fee'}</td>
                <td style={{ padding: '14px 16px', fontSize: 14, color: 'var(--text-secondary)' }}>{receipt.type?.replace('_', ' ')}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: 16 }}>₹{receipt.amount}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>Total Paid</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, fontSize: 20, color: 'var(--success-main)' }}>₹{receipt.amount}</td>
              </tr>
            </tfoot>
          </table>

          {/* Footer */}
          <div style={{ paddingTop: 24, borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0 }}>This is a computer-generated receipt and does not require a signature.</p>
            <p style={{ margin: '4px 0 0' }}>For any queries, contact hostel administration.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
