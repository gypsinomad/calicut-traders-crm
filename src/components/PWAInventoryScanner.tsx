import React, { useState, useEffect } from 'react';
import { Camera, RefreshCcw, CheckCircle2, AlertCircle, Wifi, WifiOff, Package, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QrScanner from 'react-qr-scanner';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function PWAInventoryScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  // Sync offline queue when coming back online
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineData();
    }
  }, [isOnline]);

  const syncOfflineData = async () => {
    console.log('Syncing offline data...');
    const queue = [...offlineQueue];
    setOfflineQueue([]);

    for (const item of queue) {
      try {
        await addDoc(collection(db, 'inventory_logs'), {
          ...item,
          syncedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Sync error:', error);
        setOfflineQueue(prev => [...prev, item]); // Put back in queue if failed
      }
    }
  };

  const handleScan = async (data: any) => {
    if (data && !scanResult) {
      const result = data.text;
      setScanResult(result);
      setIsScanning(false);
      
      const logEntry = {
        qrData: result,
        timestamp: new Date().toISOString(),
        type: 'SCAN_IN',
        location: 'Warehouse A'
      };

      if (isOnline) {
        try {
          await addDoc(collection(db, 'inventory_logs'), {
            ...logEntry,
            syncedAt: serverTimestamp()
          });
          setStatus('success');
        } catch (error) {
          console.error('Firestore error:', error);
          setStatus('error');
        }
      } else {
        setOfflineQueue(prev => [...prev, logEntry]);
        setStatus('success'); // Success in offline mode means queued
      }

      setTimeout(() => {
        setScanResult(null);
        setStatus('idle');
      }, 3000);
    }
  };

  const handleError = (err: any) => {
    console.error('Scanner error:', err);
    setStatus('error');
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Package size={20} />
          </div>
          <h2 className="text-lg font-bold text-zinc-900">Mobile Scanner</h2>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline Mode'}
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
        <div className="aspect-square bg-zinc-900 relative flex items-center justify-center">
          {isScanning ? (
            <QrScanner
              delay={300}
              onError={handleError}
              onScan={handleScan}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              constraints={{ video: { facingMode: 'environment' } }}
            />
          ) : (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <QrCode size={40} className="text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-sm">Ready to scan inventory</p>
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
        </div>

        <div className="p-6 text-center">
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isScanning 
                ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
            }`}
          >
            {isScanning ? (
              <>
                <RefreshCcw size={20} className="animate-spin" />
                Stop Scanning
              </>
            ) : (
              <>
                <Camera size={20} />
                Start Scanner
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`p-4 rounded-xl flex items-center gap-3 border ${
              status === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}
          >
            {status === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <div className="flex-1">
              <p className="text-sm font-bold">
                {status === 'success' 
                  ? (isOnline ? 'Scan Synced Successfully' : 'Scan Queued (Offline)')
                  : 'Scan Failed'}
              </p>
              {scanResult && <p className="text-xs opacity-70 truncate">{scanResult}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {offlineQueue.length > 0 && (
        <div className="bg-zinc-100 p-3 rounded-xl flex items-center justify-between">
          <span className="text-xs text-zinc-600">Pending Sync: {offlineQueue.length} items</span>
          {isOnline && (
            <button 
              onClick={syncOfflineData}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              Sync Now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
