import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Globe, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  X,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './Auth.tsx';

const STEPS = [
  {
    id: 1,
    title: 'Company Profile',
    description: 'Set up your export organization details and tax IDs.',
    icon: Building2,
    fields: [
      { label: 'Company Name', key: 'companyName' },
      { label: 'GSTIN / Tax ID', key: 'taxId' },
      { label: 'Headquarters Address', key: 'hqAddress' }
    ]
  },
  {
    id: 2,
    title: 'Target Markets',
    description: 'Select the regions you plan to export to for compliance checks.',
    icon: Globe,
    fields: [
      { label: 'Primary Region', key: 'primaryRegion' },
      { label: 'Default Incoterms', key: 'defaultIncoterms' },
      { label: 'Currency Preference', key: 'currency' }
    ]
  },
  {
    id: 3,
    title: 'Compliance Setup',
    description: 'Configure automated compliance screening and document rules.',
    icon: ShieldCheck,
    fields: [
      { label: 'Sanction List Screening', key: 'sanctionScreening' },
      { label: 'Auto-Doc Generation', key: 'autoDocGen' },
      { label: 'Risk Alerts', key: 'riskAlerts' }
    ]
  }
];

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isOpen, setIsOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hqAddress, setHqAddress] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = async () => {
    if (currentStep === 1 && !formData.companyName) {
      alert('Company Name is required to continue.');
      return;
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleFinish();
    }
  };

  const handleFinish = async () => {
    if (!user || !profile) return;
    
    setIsSaving(true);
    try {
      const orgId = profile.organization;
      if (orgId) {
        // 1. Save to organizations/{orgId}
        const orgRef = doc(db, 'organizations', orgId);
        await setDoc(orgRef, {
          ...formData,
          hqAddress,
          onboardingCompleted: true,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 2. Update user's profile users/{uid}
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          onboardingCompleted: true
        });

        onComplete();
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      alert('Failed to save setup. Please check your permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = STEPS[currentStep - 1];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        <div className="flex h-[500px]">
          {/* Sidebar Progress */}
          <div className="w-64 bg-zinc-50 dark:bg-zinc-800/50 p-8 border-r border-zinc-200 dark:border-zinc-800 hidden md:block">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white mb-8 uppercase tracking-widest">Onboarding</h2>
            <div className="space-y-6">
              {STEPS.map((s) => (
                <div key={s.id} className="flex items-center gap-4 group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === s.id 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                      : currentStep > s.id 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' 
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                  }`}>
                    {currentStep > s.id ? <CheckCircle2 size={16} /> : s.id}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      currentStep === s.id ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'
                    }`}>
                      {s.title}
                    </span>
                    <span className="text-[10px] text-zinc-400">Step {s.id} of 3</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col p-8 relative">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={20} />
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <div className="mb-8">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl w-fit mb-4">
                    <step.icon size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{step.description}</p>
                </div>

                <div className="space-y-4">
                  {step.fields.map((f, i) => (
                    <div key={i} className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{f.label}</label>
                      <input 
                         type="text" 
                         value={f.key === 'hqAddress' ? hqAddress : (formData[f.key] || '')}
                         onChange={(e) => f.key === 'hqAddress' ? setHqAddress(e.target.value) : handleInputChange(f.key, e.target.value)}
                         placeholder={`Enter ${f.label.toLowerCase()}...`}
                         className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between pt-8 mt-auto border-t border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={prevStep}
                disabled={currentStep === 1 || isSaving}
                className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-0 transition-all"
              >
                <ChevronLeft size={18} />
                Back
              </button>
              <div className="flex flex-col items-end gap-2">
                <button 
                  onClick={nextStep}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      {currentStep === 3 ? 'Finish Setup' : 'Continue'}
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
                <button
                  onClick={() => onComplete()}
                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-widest transition-colors"
                >
                  Skip setup
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
