import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { QrCode, XCircle } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning) {
      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          onScanSuccess(decodedText);
          stopScanning();
        },
        (error) => {
          if (onScanFailure) {
            onScanFailure(error);
          }
        }
      );
    }

    return () => {
      stopScanning();
    };
  }, [isScanning]);

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  return (
    <div className="card" style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', padding: 16, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', color: '#6366f1', marginBottom: 12 }}>
          <QrCode size={32} />
        </div>
        <h3>QR Code Scanner</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          Scan student's daily check-in QR code
        </p>
      </div>

      {!isScanning ? (
        <button className="btn btn-primary" onClick={() => setIsScanning(true)} style={{ width: '100%', maxWidth: 300, margin: '0 auto' }}>
          Start Scanning
        </button>
      ) : (
        <div style={{ position: 'relative', maxWidth: 400, margin: '0 auto' }}>
          <div id="qr-reader" style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}></div>
          <button 
            className="btn btn-secondary" 
            onClick={stopScanning}
            style={{ marginTop: 16, width: '100%', display: 'flex', justifyContent: 'center', gap: 8 }}
          >
            <XCircle size={18} /> Cancel Scanning
          </button>
        </div>
      )}
    </div>
  );
}
