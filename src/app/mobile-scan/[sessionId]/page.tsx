"use client";

import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, CheckCircle2, AlertCircle, XCircle, Camera, RefreshCw } from 'lucide-react';

interface Session {
    id: string;
    status: string;
    context: string;
    expiresAt: string;
}

export default function MobileScannerPage() {
    const router = useRouter();
    const params = useParams();
    const sessionId = params.sessionId as string;

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const scannerRef = useRef<any>(null);

    const fetchSession = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/qr-sessions/${sessionId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'EXPIRED') {
                    setError('Session has expired. Please start a new scan from the PC.');
                } else if (data.status === 'SCANNED') {
                    setSent(true);
                } else {
                    setSession(data);
                }
            } else {
                setError('Session not found. Please start a new scan from the PC.');
            }
        } catch (err) {
            setError('Failed to load session');
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    const startScanner = async () => {
        try {
            // Dynamically import html5-qrcode
            const { Html5QrcodeScanner } = await import('html5-qrcode');

            setScanning(true);
            setError(null);

            // Wait for DOM to render the div
            setTimeout(() => {
                try {
                    const scanner = new Html5QrcodeScanner(
                        "qr-reader",
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0,
                        },
                        false
                    );

                    scannerRef.current = scanner;

                    scanner.render(
                        (decodedText: string) => {
                            // Success - stop scanner and show result
                            scanner.clear();
                            setScanResult(decodedText);
                            setScanning(false);

                            // Vibrate if supported
                            if (navigator.vibrate) {
                                navigator.vibrate(200);
                            }
                        },
                        (errorMessage: string) => {
                            // QR code not found in frame - this is normal, don't show error
                        }
                    );
                } catch (err) {
                    console.error('Camera init error:', err);
                    setError(
                        'Failed to start camera. Please:\n' +
                        '1. Grant camera permissions in your browser settings\n' +
                        '2. Ensure you\'re using HTTPS (https://)\n' +
                        '3. Try refreshing the page'
                    );
                    setScanning(false);
                }
            }, 100);
        } catch (err) {
            console.error('Import error:', err);
            setError('Failed to load scanner library');
        }
    };

    const sendToPC = async () => {
        if (!scanResult) return;

        try {
            setSending(true);
            const res = await fetch(`/api/qr-sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scannedData: scanResult,
                }),
            });

            if (res.ok) {
                setSent(true);
                // Vibrate success pattern
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to send to PC');
            }
        } catch (err) {
            setError('Failed to send data to PC');
        } finally {
            setSending(false);
        }
    };

    const resetScanner = () => {
        setScanResult(null);
        setError(null);
        startScanner();
    };

    const getContextLabel = (context: string) => {
        switch (context) {
            case 'PATIENT': return 'Patient Token';
            case 'BED': return 'Bed QR Code';
            case 'LAB_ORDER': return 'Lab Order';
            default: return 'QR Code';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    if (error && !session) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <XCircle className="h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-xl font-bold text-center mb-2">Session Error</h2>
                        <p className="text-gray-500 text-center">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (sent) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="rounded-full bg-green-100 p-4 mb-4">
                            <CheckCircle2 className="h-16 w-16 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-center mb-2">Sent to PC!</h2>
                        <p className="text-gray-500 text-center mb-4">
                            The scanned data has been sent. Check your PC screen.
                        </p>
                        <Badge className="bg-green-100 text-green-800">{scanResult}</Badge>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-900 p-4">
            <div className="max-w-md mx-auto space-y-4">
                {/* Header */}
                <div className="text-center text-white py-4">
                    <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-4">
                        <Smartphone className="h-5 w-5" />
                        <span className="font-medium">Mobile Scanner</span>
                    </div>
                    <h1 className="text-2xl font-bold">Scan {getContextLabel(session?.context || 'PATIENT')}</h1>
                    <p className="text-indigo-200 mt-1">Point your camera at the QR code</p>
                </div>

                {/* Scanner Area */}
                <Card className="overflow-hidden">
                    <CardContent className="p-0">
                        {!scanning && !scanResult ? (
                            <div className="flex flex-col items-center justify-center py-16 px-4">
                                <Camera className="h-16 w-16 text-gray-400 mb-4" />
                                <p className="text-gray-500 text-center mb-4">
                                    Tap the button below to start scanning
                                </p>
                                <Button onClick={startScanner} size="lg" className="w-full">
                                    <Camera className="mr-2 h-5 w-5" />
                                    Start Camera
                                </Button>
                            </div>
                        ) : scanResult ? (
                            <div className="p-6 space-y-4">
                                <div className="text-center">
                                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                    <h3 className="font-bold text-lg">Scanned Successfully!</h3>
                                </div>
                                <div className="bg-gray-100 rounded-lg p-4 text-center">
                                    <p className="text-sm text-gray-500 mb-1">Scanned Data:</p>
                                    <p className="font-mono font-bold text-lg break-all">{scanResult}</p>
                                </div>
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                                        {error}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="outline" onClick={resetScanner}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Scan Again
                                    </Button>
                                    <Button onClick={sendToPC} disabled={sending} className="bg-green-600 hover:bg-green-700">
                                        {sending ? 'Sending...' : 'Send to PC'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div id="qr-reader" className="w-full"></div>
                                <div className="p-4">
                                    <Button variant="outline" onClick={() => {
                                        if (scannerRef.current) {
                                            scannerRef.current.clear();
                                        }
                                        setScanning(false);
                                    }} className="w-full">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Session Info */}
                {session && (() => {
                    const expiryTime = new Date(session.expiresAt).getTime();
                    const remainingMs = expiryTime - Date.now();
                    const remainingMinutes = Math.max(0, Math.round(remainingMs / 1000 / 60));
                    const isValid = !isNaN(remainingMinutes);

                    return (
                        <div className="text-center text-indigo-200 text-sm">
                            <p>Session expires in {isValid ? remainingMinutes : 5} minutes</p>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
