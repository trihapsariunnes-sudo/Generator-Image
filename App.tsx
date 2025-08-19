import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { PromptParts } from './types';
import { NEGATIVE_PROMPT } from './constants';
import * as geminiService from './services/geminiService';
import GlassCard from './components/GlassCard';
import LoadingSpinner from './components/LoadingSpinner';
import SparklesIcon from './components/icons/SparklesIcon';
import CopyIcon from './components/icons/CopyIcon';

const initialPrompt: PromptParts = {
  background: '',
  subjek: '',
  pose: '',
  kamera: '',
};

const App: React.FC = () => {
  const [userInput, setUserInput] = useState<string>('');
  const [indonesianPrompt, setIndonesianPrompt] = useState<PromptParts>(initialPrompt);
  const [englishPrompt, setEnglishPrompt] = useState<PromptParts>(initialPrompt);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<{ id: string; text: string } | null>(null);
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  const handleGeneratePrompt = async () => {
    if (!userInput.trim()) {
      setError('Mohon masukkan ide awal untuk prompt.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setIndonesianPrompt(initialPrompt);
    setEnglishPrompt(initialPrompt);

    try {
      const generatedParts = await geminiService.generatePromptDetails(userInput);
      setIndonesianPrompt(generatedParts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan yang tidak diketahui.');
    } finally {
      setIsLoading(false);
    }
  };

  const translateAllParts = useCallback(async (parts: PromptParts) => {
    setIsTranslating(true);
    try {
      const [background, subjek, pose, kamera] = await Promise.all([
        geminiService.translateToEnglish(parts.background),
        geminiService.translateToEnglish(parts.subjek),
        geminiService.translateToEnglish(parts.pose),
        geminiService.translateToEnglish(parts.kamera),
      ]);
      setEnglishPrompt({ background, subjek, pose, kamera });
    } catch (err) {
      setError("Gagal menerjemahkan prompt. Silakan coba lagi.");
    } finally {
      setIsTranslating(false);
    }
  }, []);

  useEffect(() => {
    if (indonesianPrompt.subjek) { // Trigger translation only when new Indonesian prompt is set
      translateAllParts(indonesianPrompt);
    }

    // Auto-resize textareas after content is populated from API
    requestAnimationFrame(() => {
      Object.values(textareaRefs.current).forEach(textarea => {
        if (textarea) {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        }
      });
    });
  }, [indonesianPrompt, translateAllParts]);


  const handleIndonesianChange = (field: keyof PromptParts, value: string) => {
    setIndonesianPrompt(prev => ({ ...prev, [field]: value }));
  };
  
  const finalJsonPrompt = useMemo(() => {
    if (!englishPrompt.subjek) return '';

    const fullPrompt = [
      englishPrompt.subjek,
      englishPrompt.pose,
      englishPrompt.background,
      `style of ${englishPrompt.kamera}`,
      "ultra realistic",
      "high detail",
      "8k",
    ].filter(Boolean).join(', ');

    const promptObject = {
      prompt: fullPrompt,
      negative_prompt: NEGATIVE_PROMPT,
    };
    return JSON.stringify(promptObject, null, 2);
  }, [englishPrompt]);


  const handleCopy = (text: string, id: string) => {
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopyStatus({ id, text: 'Disalin!' });
        setTimeout(() => setCopyStatus(null), 2000);
      }, (err) => {
        setCopyStatus({ id, text: 'Gagal' });
        setTimeout(() => setCopyStatus(null), 2000);
        console.error('Could not copy text: ', err);
      });
    }
  };
  
  const combinedIndonesianText = useMemo(() => {
    if (!indonesianPrompt.subjek) return '';
    return (Object.keys(indonesianPrompt) as Array<keyof PromptParts>)
      .map(key => `${key.charAt(0).toUpperCase() + key.slice(1)}:\n${indonesianPrompt[key]}`)
      .join('\n\n');
  }, [indonesianPrompt]);

  const combinedEnglishText = useMemo(() => {
    if (!englishPrompt.subjek) return '';
    return (Object.keys(englishPrompt) as Array<keyof PromptParts>)
      .map(key => `${key.charAt(0).toUpperCase() + key.slice(1)}:\n${englishPrompt[key]}`)
      .join('\n\n');
  }, [englishPrompt]);

  const hasResults = indonesianPrompt.subjek !== '';

  return (
    <div className="min-h-screen w-full text-white p-4 md:p-8 flex flex-col items-center">
      <main className="w-full max-w-5xl mx-auto flex flex-col gap-6">
        <header className="text-center py-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-shadow-lg">
            Prompt Generator Image
          </h1>
          <p className="text-lg md:text-xl text-white/80 mt-2">
            Buat prompt gambar yang detail dan menakjubkan dengan mudah.
          </p>
        </header>

        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Masukkan ide sederhana Anda di sini..."
              className="w-full bg-white/30 text-white placeholder-white/70 rounded-lg px-4 py-3 border border-transparent focus:outline-none focus:ring-2 focus:ring-pink-400 transition resize-none custom-scrollbar"
              rows={2}
            />
            <button
              onClick={handleGeneratePrompt}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              <SparklesIcon className="w-5 h-5" />
              {isLoading ? 'Menghasilkan...' : 'Buat Prompt'}
            </button>
          </div>
        </GlassCard>

        {error && <GlassCard className="p-4 bg-red-500/50"><p className="text-center font-semibold">{error}</p></GlassCard>}
        
        {isLoading && <LoadingSpinner />}

        {hasResults && !isLoading && (
            <div className="animate-fade-in">
                <GlassCard className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex justify-between items-center col-span-1">
                            <h2 className="text-2xl font-bold">Bahasa Indonesia</h2>
                            <button onClick={() => handleCopy(combinedIndonesianText, 'id-all')} className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 font-semibold py-1 px-2 rounded-lg transition-colors duration-200">
                                <CopyIcon className="w-3 h-3" />
                                {copyStatus?.id === 'id-all' ? copyStatus.text : 'Salin Semua'}
                            </button>
                        </div>
                         <div className="flex justify-between items-center col-span-1">
                            <h2 className="text-2xl font-bold">English (Final)</h2>
                             <button onClick={() => handleCopy(combinedEnglishText, 'en-all')} className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 font-semibold py-1 px-2 rounded-lg transition-colors duration-200">
                                <CopyIcon className="w-3 h-3" />
                                {copyStatus?.id === 'en-all' ? copyStatus.text : 'Salin Semua'}
                            </button>
                        </div>
                        
                        {(Object.keys(indonesianPrompt) as Array<keyof PromptParts>).map((key) => (
                            <React.Fragment key={key}>
                                <div>
                                    <label className="capitalize font-semibold text-white/80 mb-1 block">{key}</label>
                                    <textarea
                                        ref={(el) => { textareaRefs.current[key] = el; }}
                                        value={indonesianPrompt[key]}
                                        onChange={(e) => handleIndonesianChange(key, e.target.value)}
                                        onInput={(e) => {
                                          const target = e.currentTarget;
                                          target.style.height = 'auto';
                                          target.style.height = `${target.scrollHeight}px`;
                                        }}
                                        className="w-full bg-white/30 text-white rounded-lg p-3 border border-transparent focus:outline-none focus:ring-2 focus:ring-pink-400 transition resize-none overflow-hidden"
                                        rows={1}
                                    />
                                </div>
                                <div>
                                    <label className="capitalize font-semibold text-white/80 mb-1 block">{key}</label>
                                    <div className="w-full bg-white/10 text-white/90 rounded-lg p-3 flex-grow min-h-[4rem]">
                                        {isTranslating ? <span className="text-white/60">Menerjemahkan...</span> : <p className="whitespace-pre-wrap break-words">{englishPrompt[key]}</p>}
                                    </div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </GlassCard>
                
                <GlassCard className="p-6 mt-6">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-2xl font-bold">Hasil Akhir (JSON)</h2>
                        <button onClick={() => handleCopy(finalJsonPrompt, 'json-final')} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                            <CopyIcon className="w-5 h-5" />
                            {copyStatus?.id === 'json-final' ? copyStatus.text : 'Salin'}
                        </button>
                    </div>
                    <pre className="bg-white/10 rounded-lg p-4 text-sm whitespace-pre-wrap break-words">
                        <code>
                            {finalJsonPrompt}
                        </code>
                    </pre>
                </GlassCard>
            </div>
        )}

      </main>
    </div>
  );
};

export default App;

// Simple fade-in animation using Tailwind config (won't work here but shows intent)
// In a real project with tailwind.config.js, you'd add:
/*
keyframes: {
  'fade-in': {
    '0%': { opacity: '0', transform: 'translateY(10px)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
},
animation: {
  'fade-in': 'fade-in 0.5s ease-out forwards',
},
*/
// For this single-file setup, we rely on browser defaults or add style tag if needed.
// The effect is subtle without it. I'll add a class `animate-fade-in` and if user has custom config it would work.
// For now, it will just appear.