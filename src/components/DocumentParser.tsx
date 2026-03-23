import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { handleAIError, generateAIContent, isAIAvailable } from '../lib/ai';

export default function DocumentParser() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const parseDocument = async () => {
    if (!file) return;

    if (!isAIAvailable()) {
      // Rule-based fallback: Show a manual entry form or mock extraction
      setParsing(true);
      setTimeout(() => {
        setResult({
          documentType: 'Manual Entry Required',
          documentNumber: 'PENDING',
          date: new Date().toISOString().split('T')[0],
          totalAmount: 0,
          currency: 'USD',
          exporter: 'Calicut Spice Traders LLP',
          importer: 'Unknown',
          items: []
        });
        setParsing(false);
        setError('AI parsing is currently unavailable. Please enter details manually.');
      }, 1500);
      return;
    }

    setParsing(true);
    setError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const model = 'gemini-3-flash-preview';
      const prompt = `Extract key information from this export document (Invoice, Packing List, or Certificate). 
      Return a JSON object with fields like: documentType, documentNumber, date, totalAmount, currency, exporter, importer, and a list of items (name, quantity, weight).
      If a field is not found, leave it null.`;

      const response = await generateAIContent('Smart Extract', {
        model,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsedData = JSON.parse(response.text);
      setResult(parsedData);
    } catch (err: any) {
      setError(handleAIError(err));
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900">
              {isAIAvailable() ? 'AI Document Parser' : 'Smart Document Assistant'}
            </h3>
            <p className="text-xs text-zinc-500">
              {isAIAvailable() ? 'Extract data from invoices and certificates automatically' : 'Upload and manually verify document details'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {!result ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer relative">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileChange}
                accept="image/*,application/pdf"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="text-zinc-400" size={32} />
                <p className="text-sm font-medium text-zinc-900">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-zinc-500">PDF, PNG, JPG up to 10MB</p>
              </div>
            </div>

            <button
              onClick={parseDocument}
              disabled={!file || parsing}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {parsing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {isAIAvailable() ? 'Analyzing Document...' : 'Preparing Manual Entry...'}
                </>
              ) : (
                <>
                  {isAIAvailable() ? <Sparkles size={20} /> : <FileText size={20} />}
                  {isAIAvailable() ? 'Extract Data' : 'Process Document'}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 size={20} />
                <span className="text-sm font-bold uppercase tracking-wider">
                  {isAIAvailable() ? 'Extraction Complete' : 'Ready for Manual Entry'}
                </span>
              </div>
              <button 
                onClick={() => {setResult(null); setFile(null); setError(null);}}
                className="text-xs text-zinc-500 hover:text-zinc-900 underline"
              >
                Upload New
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-[10px] text-zinc-400 uppercase font-black mb-1">Document Type</p>
                <p className="text-sm font-bold text-zinc-900">{result.documentType || 'Unknown'}</p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-[10px] text-zinc-400 uppercase font-black mb-1">Number</p>
                <p className="text-sm font-bold text-zinc-900">{result.documentNumber || 'N/A'}</p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-[10px] text-zinc-400 uppercase font-black mb-1">Date</p>
                <p className="text-sm font-bold text-zinc-900">{result.date || 'N/A'}</p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                <p className="text-[10px] text-zinc-400 uppercase font-black mb-1">Total Amount</p>
                <p className="text-sm font-bold text-emerald-600">
                  {result.totalAmount ? `${result.currency || '$'} ${result.totalAmount}` : 'N/A'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-zinc-400 uppercase font-black">Line Items</p>
              <div className="space-y-2">
                {result.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white border border-zinc-100 rounded-lg text-xs">
                    <span className="font-bold text-zinc-900">{item.name}</span>
                    <span className="text-zinc-500">{item.quantity} {item.weight}</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors">
              Import to System
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {error && (
          <div className={`flex items-center gap-2 p-4 ${isAIAvailable() ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'} rounded-xl border text-sm`}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
