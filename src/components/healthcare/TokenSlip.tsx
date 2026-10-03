"use client";

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { generateTokenSlipPDF } from '@/lib/pdf-generator';

interface TokenSlipProps {
  visitId: string;
  tokenNumber: number;
  patientName: string;
  patientNumber: string;
  visitType: string;
  visitDate: string;
  doctorName?: string;
  hospitalName?: string;
}

export function TokenSlip({
  visitId,
  tokenNumber,
  patientName,
  patientNumber,
  visitType,
  visitDate,
  doctorName,
  hospitalName = "SLICT Hospital",
}: TokenSlipProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate QR code with visitId
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(visitId, {
          width: 120,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    generateQR();
  }, [visitId]);

  const handlePrint = () => {
    generateTokenSlipPDF({
      tokenNumber,
      patientName,
      patientNumber,
      visitType,
      date: new Date(visitDate)
    });
  };

  const formattedDate = new Date(visitDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = new Date(visitDate).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="flex flex-col gap-4">
      <div
        id="token-slip-content"
        className="w-[280px] mx-auto bg-white border-2 border-dashed border-gray-400 rounded-lg p-4 text-center"
      >
        <div className="slip-container">
          <h2 className="hospital-name text-lg font-bold">{hospitalName}</h2>
          <p className="slip-title text-sm text-gray-500">{visitType} TOKEN</p>

          <div className="token-number text-5xl font-bold text-blue-600 my-4">
            #{String(tokenNumber).padStart(3, '0')}
          </div>

          {qrDataUrl && (
            <div className="qr-container flex justify-center my-3">
              <img src={qrDataUrl} alt="QR Code" className="w-24 h-24" />
            </div>
          )}

          <div className="patient-info text-sm space-y-1">
            <p className="font-semibold">{patientName}</p>
            <p className="text-gray-600">{patientNumber}</p>
            {doctorName && <p className="text-gray-500">Doctor: {doctorName}</p>}
          </div>

          <div className="date-info text-xs text-gray-500 mt-3">
            <p>{formattedDate} • {formattedTime}</p>
          </div>

          <div className="footer text-xs text-gray-400 mt-3 pt-3 border-t border-dashed border-gray-200">
            <p>Please wait for your token to be called</p>
            <p className="mt-1">Keep this slip for reference</p>
          </div>
        </div>
      </div>

      <Button onClick={handlePrint} className="mx-auto">
        <Printer className="mr-2 h-4 w-4" /> Print Token
      </Button>
    </div>
  );
}

// Preview component for display in dialogs
export function TokenSlipPreview({
  visitId,
  tokenNumber,
  patientName,
  patientNumber,
  visitType,
  visitDate,
  doctorName,
}: TokenSlipProps) {
  return (
    <TokenSlip
      visitId={visitId}
      tokenNumber={tokenNumber}
      patientName={patientName}
      patientNumber={patientNumber}
      visitType={visitType}
      visitDate={visitDate}
      doctorName={doctorName}
    />
  );
}
