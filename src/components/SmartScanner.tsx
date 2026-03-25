import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Package, 
  QrCode, 
  UserPlus, 
  FileText, 
  X, 
  Save, 
  Loader2,
  ScanLine,
  ChevronRight,
  Smartphone,
  CreditCard,
  FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QrScanner from 'react-qr-scanner';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { generateAIContent } from '../lib/ai';
import { Type } from '@google/genai';

type ScannerMode = 'inventory' | 'business_card' | 'document';

export default function SmartScanner() {
  const [mode, setMode] = useState<ScannerMode>('inventory');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'processing'>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const startCamera = async () => {
    if (mode === 'inventory') {
      setIsScanning(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setStatus('error');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
        processImage(dataUrl);
      }
    }
  };

  const processImage = async (dataUrl: string) => {
    setIsProcessing(true);
    setStatus('processing');
    
    try {
      const base64Data = dataUrl.split(',')[1];
      const mimeType = 'image/jpeg';

      let prompt = '';
      let schema: any = {};

      if (mode === 'business_card') {
        prompt = "Extract contact information from this business card. Return as JSON.";
        schema = {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            companyName: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            jobTitle: { type: Type.STRING },
            website: { type: Type.STRING },
            address: { type: Type.STRING }
          },
          required: ['fullName']
        };
      } else if (mode === 'document') {
        prompt = "Analyze this document (Quotation or RFQ). Extract key details including items, quantities, and total amount. Return as JSON.";
        schema = {
          type: Type.OBJECT,
          properties: {
            documentType: { type: Type.STRING, enum: ['quotation', 'rfq', 'invoice', 'other'] },
            documentNumber: { type: Type.STRING },
            companyName: { type: Type.STRING },
            date: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  unitPrice: { type: Type.NUMBER },
                  totalPrice: { type: Type.NUMBER }
                }
              }
            },
            totalAmount: { type: Type.NUMBER },
            currency: { type: Type.STRING }
          }
        };
      }

      const response = await generateAIContent('smart_scanner', {
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType } }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      });

      const result = JSON.parse(response.text);
      setScanResult(result);
      setStatus('idle');
    } catch (error) {
      console.error('AI Processing error:', error);
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQRScan = async (data: any) => {
    if (data && !scanResult) {
      const result = data.text;
      setScanResult({ qrData: result, type: 'inventory_log' });
      setIsScanning(false);
      setStatus('success');
      
      // Auto-save for QR
      saveToDatabase({ qrData: result, type: 'inventory_log' });
    }
  };

  const saveToDatabase = async (data: any) => {
    const user = auth.currentUser;
    if (!user) return;

    const profileSnap = await getDoc(doc(db, 'users', user.uid));
    const organization = profileSnap.exists() ? profileSnap.data().organization : 'default';

    try {
      let collectionName = '';
      let payload: any = { ...data, organization, createdAt: serverTimestamp() };

      if (mode === 'inventory') {
        collectionName = 'inventory_logs';
      } else if (mode === 'business_card') {
        collectionName = 'leads';
        payload = {
          fullName: data.fullName || 'Unknown',
          companyName: data.companyName || '',
          email: data.email || '',
          phone: data.phone || '',
          status: 'new',
          source: 'manual',
          priority: 'warm',
          organization,
          createdAt: serverTimestamp(),
          assignedUserId: user.uid
        };
      } else if (mode === 'document') {
        if (data.documentType === 'rfq' || data.documentType === 'quotation') {
          collectionName = 'quotes';
          payload = {
            quoteNumber: data.documentNumber || `Q-${Math.floor(Math.random() * 10000)}`,
            companyName: data.companyName || '',
            items: (data.items || []).map((item: any) => ({
              id: Math.random().toString(36).substr(2, 9),
              name: item.description || 'Item',
              description: item.description || '',
              quantity: item.quantity || 0,
              unit: item.unit || 'kg',
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || 0
            })),
            totalAmount: data.totalAmount || 0,
            currency: data.currency || 'USD',
            status: 'draft',
            organization,
            createdAt: serverTimestamp(),
            createdBy: user.uid
          };
        } else {
          collectionName = 'orders';
          payload = {
            orderNumber: data.documentNumber || `ORD-${Math.floor(Math.random() * 10000)}`,
            customerName: data.companyName || '',
            totalAmount: data.totalAmount || 0,
            currency: data.currency || 'USD',
            stage: 'leadReceived',
            status: 'Pending Review',
            organization,
            createdAt: serverTimestamp(),
            assignedUserId: user.uid
          };
        }
      }

      await addDoc(collection(db, collectionName), payload);
      setStatus('success');
      setTimeout(() => {
        setScanResult(null);
        setCapturedImage(null);
        setStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Save error:', error);
      setStatus('error');
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <ScanLine size={20} />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Smart Scanner</h2>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </header>

      {/* Mode Selector */}
      <div className="flex p-1 bg-zinc-100 rounded-xl">
        {[
          { id: 'inventory', label: 'Inventory', icon: Package },
          { id: 'business_card', label: 'Card', icon: CreditCard },
          { id: 'document', label: 'Doc', icon: FileSearch },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMode(m.id as ScannerMode);
              setScanResult(null);
              setCapturedImage(null);
              stopCamera();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === m.id 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <m.icon size={14} />
            {m.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
        <div className="aspect-[3/4] bg-zinc-900 relative flex items-center justify-center">
          {isScanning ? (
            mode === 'inventory' ? (
              <QrScanner
                delay={300}
                onError={(err: any) => setStatus('error')}
                onScan={handleQRScan}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                constraints={{ video: { facingMode: 'environment' } }}
              />
            ) : (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            )
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                {mode === 'inventory' ? <QrCode size={40} className="text-zinc-600" /> : 
                 mode === 'business_card' ? <CreditCard size={40} className="text-zinc-600" /> :
                 <FileText size={40} className="text-zinc-600" />}
              </div>
              <p className="text-zinc-500 text-sm">
                {mode === 'inventory' ? 'Ready to scan QR/Barcode' : 
                 mode === 'business_card' ? 'Ready to scan Business Card' :
                 'Ready to scan Quotation/RFQ'}
              </p>
            </div>
          )}

          {/* Scanning Overlay */}
          {isScanning && (
            <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
              <div className="w-full h-full border-2 border-emerald-500/50 relative">
                <motion.div 
                  animate={{ top: ['0%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4">
              <Loader2 size={40} className="animate-spin text-emerald-400" />
              <p className="text-sm font-bold animate-pulse">AI Analyzing Document...</p>
            </div>
          )}
        </div>

        <div className="p-6">
          {!scanResult && !isProcessing && (
            <button
              onClick={isScanning ? (mode === 'inventory' ? stopCamera : captureImage) : startCamera}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isScanning 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                  : 'bg-zinc-900 text-white'
              }`}
            >
              {isScanning ? (
                mode === 'inventory' ? (
                  <>
                    <RefreshCcw size={20} className="animate-spin" />
                    Stop Scanning
                  </>
                ) : (
                  <>
                    <Camera size={20} />
                    Capture Photo
                  </>
                )
              ) : (
                <>
                  <Camera size={20} />
                  Start Camera
                </>
              )}
            </button>
          )}

          {scanResult && !isProcessing && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900">Extracted Details</h3>
                  <button onClick={() => { setScanResult(null); setCapturedImage(null); }} className="text-zinc-400">
                    <X size={16} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {Object.entries(scanResult).map(([key, value]: [string, any]) => {
                    if (key === 'items' && Array.isArray(value)) return null;
                    return (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-zinc-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-bold text-zinc-900 text-right">{String(value)}</span>
                      </div>
                    );
                  })}
                </div>

                {scanResult.items && (
                  <div className="pt-2 border-t border-zinc-200">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Line Items</p>
                    <div className="space-y-1">
                      {scanResult.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[10px]">
                          <span className="text-zinc-600 truncate max-w-[150px]">{item.description}</span>
                          <span className="font-bold">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setScanResult(null); setCapturedImage(null); }}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-bold text-sm"
                >
                  Discard
                </button>
                <button
                  onClick={() => saveToDatabase(scanResult)}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/20"
                >
                  Save to {mode === 'business_card' ? 'Leads' : mode === 'document' ? 'Records' : 'Logs'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-4 right-4 p-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 z-50"
          >
            <CheckCircle2 size={24} />
            <div>
              <p className="font-bold">Successfully Saved</p>
              <p className="text-xs opacity-80">The record has been added to your database.</p>
            </div>
          </motion.div>
        )}
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-4 right-4 p-4 bg-rose-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 z-50"
          >
            <AlertCircle size={24} />
            <div>
              <p className="font-bold">Scanner Error</p>
              <p className="text-xs opacity-80">Could not process or save the data. Please try again.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
