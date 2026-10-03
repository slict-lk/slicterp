"use client";

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Smartphone, QrCode, Loader2, CheckCircle2, X, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';

interface ScanWithPhoneButtonProps {
    onScanned: (data: string) => void;
    context?: 'PATIENT' | 'BED' | 'LAB_ORDER';
    buttonText?: string;
    className?: string;
}

interface Session {
    id: string;
    status: string;
    scanUrl: string;
    scannedData: string | null;
}

export function ScanWithPhoneButton({
    onScanned,
    context = 'PATIENT',
    buttonText = 'Scan with Phone',
    className = '',
}: ScanWithPhoneButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [polling, setPolling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createSession = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch('/api/qr-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ context }),
            });

            if (!res.ok) throw new Error('Failed to create session');

            const data = await res.json();
            setSession(data);

            // Generate QR code for the scan URL
            const fullUrl = `${window.location.origin}${data.scanUrl}`;
            const qrCode = await QRCode.toDataURL(fullUrl, {
                width: 256,
                margin: 2,
                color: { dark: '#000', light: '#fff' },
            });
            setQrDataUrl(qrCode);
            setPolling(true);
        } catch (err) {
            setError('Failed to create scan session');
        } finally {
            setLoading(false);
        }
    }, [context]);

    // Poll for scan result
    useEffect(() => {
        if (!polling || !session) return;

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/qr-sessions/${session.id}`);
                if (!res.ok) {
                    clearInterval(pollInterval);
                    setError('Session expired');
                    setPolling(false);
                    return;
                }

                const data = await res.json();

                if (data.status === 'SCANNED' && data.scannedData) {
                    clearInterval(pollInterval);
                    setPolling(false);
                    onScanned(data.scannedData);
                    setIsOpen(false);
                    // Clean up session
                    setSession(null);
                    setQrDataUrl(null);
                } else if (data.status === 'EXPIRED') {
                    clearInterval(pollInterval);
                    setError('Session expired');
                    setPolling(false);
                }
            } catch (err) {
                // Continue polling on error
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [polling, session, onScanned]);

    const handleOpen = () => {
        setIsOpen(true);
        createSession();
    };

    const handleClose = () => {
        setIsOpen(false);
        setPolling(false);
        setSession(null);
        setQrDataUrl(null);
        setError(null);
    };

    const getContextLabel = () => {
        switch (context) {
            case 'PATIENT': return 'patient token';
            case 'BED': return 'bed QR code';
            case 'LAB_ORDER': return 'lab order';
            default: return 'QR code';
        }
    };

    return (
        <>
            <Button variant="outline" onClick={handleOpen} className={className}>
                <Smartphone className="mr-2 h-4 w-4" />
                {buttonText}
            </Button>

            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            Scan with Phone
                        </DialogTitle>
                        <DialogDescription>
                            Scan this QR code with your phone to open the scanner
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center py-6">
                        {loading ? (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                <p className="text-gray-500">Creating session...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="rounded-full bg-red-100 p-3">
                                    <X className="h-8 w-8 text-red-500" />
                                </div>
                                <p className="text-red-600">{error}</p>
                                <Button onClick={createSession}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Try Again
                                </Button>
                            </div>
                        ) : qrDataUrl ? (
                            <>
                                <div className="bg-white p-4 rounded-xl shadow-lg">
                                    <img src={qrDataUrl} alt="Scan QR Code" className="w-64 h-64" />
                                </div>

                                <div className="mt-4 text-center">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <div className="animate-pulse flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                            <span>Waiting for scan...</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                                    <p className="font-medium text-blue-800 mb-2">Instructions:</p>
                                    <ol className="list-decimal list-inside text-blue-700 space-y-1">
                                        <li>Open your phone&apos;s camera</li>
                                        <li>Point it at this QR code</li>
                                        <li>Tap the link to open scanner</li>
                                        <li>Scan the {getContextLabel()}</li>
                                    </ol>
                                </div>
                            </>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
