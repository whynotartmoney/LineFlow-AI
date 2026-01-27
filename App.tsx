
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Play, Download, Trash2, Palette, Image as ImageIcon, Sparkles, RefreshCw, Layers, ChevronRight, ChevronLeft } from 'lucide-react';
import { generateOneLineArt } from './services/geminiService';
import { EffectType } from './types';
import EffectFilters from './components/EffectFilters';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [pathData, setPathData] = useState<string | null>(null);
  const [variants, setVariants] = useState<{ [key: number]: string }>({});
  const [selectedVariant, setSelectedVariant] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lineColor, setLineColor] = useState('#1a1a1a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [effect, setEffect] = useState<EffectType>('none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(100);
  const [showCamera, setShowCamera] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const effectsScrollRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        setImage(data);
        setVariants({});
        processImage(data, selectedVariant);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Could not access camera.");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setImage(dataUrl);
        setVariants({});
        processImage(dataUrl, selectedVariant);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setShowCamera(false);
  };

  const processImage = async (imgData: string, variant: number) => {
    if (variants[variant]) {
      setPathData(variants[variant]);
      setSelectedVariant(variant);
      setProgress(0);
      setIsPlaying(true);
      return;
    }

    setIsProcessing(true);
    setSelectedVariant(variant);
    try {
      const path = await generateOneLineArt(imgData, variant);
      if (path) {
        setPathData(path);
        setVariants(prev => ({ ...prev, [variant]: path }));
        setProgress(0);
        setIsPlaying(true);
      } else {
        alert("Path generation failed. Try a lower complexity.");
      }
    } catch (error) {
      alert("AI Service error. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    let animationFrame: number;
    if (isPlaying && progress < 100) {
      const animate = () => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          // Dynamic speed based on path complexity would be nice, but fixed for now
          return prev + 1.2;
        });
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, progress]);

  const togglePlayback = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  const getFilter = (eff: EffectType) => {
    if (eff === 'none') return 'none';
    return `url(#${eff}-effect)`;
  };

  const getStroke = (eff: EffectType) => {
    if (eff === 'metal') return 'url(#metal-gradient)';
    return lineColor;
  };

  const downloadPNG = () => {
    if (!svgRef.current || !pathData) return;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High res output
    const width = 2400;
    const height = 1800;
    canvas.width = width;
    canvas.height = height;

    // Draw Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Prepare styles and filters for SVG string conversion
    const filters = document.querySelector('svg defs')?.innerHTML || '';
    const strokeValue = getStroke(effect) === 'url(#metal-gradient)' ? '#888888' : lineColor;
    
    const styledSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="${width}" height="${height}">
        <defs>${filters}</defs>
        <path d="${pathData}" fill="none" stroke="${strokeValue}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="${getFilter(effect)}" />
      </svg>
    `;

    const img = new Image();
    const svgBlob = new Blob([styledSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `LineFlowArt_Lvl${selectedVariant}_${effect}.png`;
      downloadLink.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const effectsList: EffectType[] = ['none', 'glow', 'glass', 'metal', 'neon', 'sketch', 'shadow', 'emboss'];

  const scrollEffects = (dir: 'left' | 'right') => {
    if (effectsScrollRef.current) {
      const scrollAmount = 150;
      effectsScrollRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <EffectFilters />
      
      {/* Side Control Panel */}
      <aside className="w-full md:w-80 bg-white border-b md:border-r border-slate-200 p-6 flex flex-col gap-8 shrink-0 z-20 overflow-y-auto max-h-screen">
        <header>
          <h1 className="text-3xl font-serif text-slate-900 mb-2">LineFlow AI</h1>
          <p className="text-sm text-slate-500 font-medium">One-line art generator.</p>
        </header>

        {/* Upload/Capture Section */}
        <section className="space-y-4">
          <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Media Input</label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={startCamera} className="flex flex-col items-center justify-center p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all active:scale-95 group shadow-lg shadow-slate-200">
              <Camera className="mb-2 group-hover:scale-110 transition-transform" size={24} />
              <span className="text-[11px] font-bold">Camera</span>
            </button>
            <label className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-slate-900 hover:bg-slate-50 transition-all group">
              <Upload className="mb-2 text-slate-300 group-hover:text-slate-900 transition-colors" size={24} />
              <span className="text-[11px] font-bold text-slate-500">Upload</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>
        </section>

        {/* Abstraction Complexity 1-10 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
              <Layers size={14} /> Complexity (1-10)
            </label>
            <span className="text-[11px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{selectedVariant}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <button
                key={v}
                disabled={!image || isProcessing}
                onClick={() => image && processImage(image, v)}
                className={`h-9 rounded-lg font-bold transition-all border-2 text-[11px] flex items-center justify-center ${
                  selectedVariant === v 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                } ${(!image || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-90'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[9px] font-bold text-slate-300 px-1 uppercase">
            <span>Abstract</span>
            <span>Realistic</span>
          </div>
        </section>

        {/* Effects Box - Scrollable */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
              <Sparkles size={14} /> Finish & Effects
            </label>
            <div className="flex gap-1">
              <button onClick={() => scrollEffects('left')} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={14}/></button>
              <button onClick={() => scrollEffects('right')} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={14}/></button>
            </div>
          </div>
          <div 
            ref={effectsScrollRef}
            className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide snap-x"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {effectsList.map((eff) => (
              <button
                key={eff}
                onClick={() => setEffect(eff)}
                className={`min-w-[80px] h-20 snap-center rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                  effect === eff 
                  ? 'bg-indigo-50 border-indigo-500 shadow-inner' 
                  : 'bg-slate-50 border-transparent hover:bg-slate-100'
                }`}
              >
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  style={{ 
                    background: eff === 'metal' ? 'linear-gradient(135deg, #777, #eee, #777)' : lineColor,
                    filter: getFilter(eff)
                  }}
                />
                <span className={`text-[10px] font-bold capitalize ${effect === eff ? 'text-indigo-600' : 'text-slate-500'}`}>{eff}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Color Customization */}
        <section className="space-y-4 p-4 bg-slate-50 rounded-2xl">
          <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
            <Palette size={14} /> Color Palette
          </label>
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-2">
              <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-4 border-white shadow-md overflow-hidden bg-transparent" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Line</span>
            </div>
            <div className="h-10 w-[1px] bg-slate-200" />
            <div className="flex flex-col items-center gap-2">
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-4 border-white shadow-md overflow-hidden bg-transparent" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Paper</span>
            </div>
          </div>
        </section>

        {/* Playback Button */}
        <footer className="mt-auto">
          <button
            disabled={!pathData || isProcessing}
            onClick={togglePlayback}
            className={`w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${
              !pathData || isProcessing ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 active:shadow-indigo-900/20'
            }`}
          >
            {isPlaying ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
            {progress < 100 ? `Crafting... ${Math.round(progress)}%` : "Watch Drawing Trace"}
          </button>
        </footer>
      </aside>

      {/* Main Artboard Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-4 md:p-12 lg:p-20">
        <div 
          className="relative w-full max-w-5xl aspect-[4/3] rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-700 ease-in-out ring-1 ring-slate-100"
          style={{ backgroundColor: bgColor }}
        >
          {/* Faded Original Image for reference during loading */}
          {image && isProcessing && (
            <img src={image} className="absolute inset-0 w-full h-full object-contain opacity-10 blur-sm scale-110 grayscale" />
          )}

          {/* AI Loader */}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-white/60 backdrop-blur-md">
              <div className="relative w-28 h-28 mb-8">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-indigo-600 rounded-full animate-spin" />
                <div className="absolute inset-4 border-2 border-slate-100 rounded-full animate-pulse" />
              </div>
              <h2 className="text-2xl font-serif text-slate-900 font-bold mb-1 italic">Thinking in Lines...</h2>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Complexity Level {selectedVariant}</p>
            </div>
          )}

          {/* SVG Path Rendering */}
          {pathData && (
            <svg 
              ref={svgRef}
              viewBox="0 0 1000 1000" 
              className="absolute inset-0 w-full h-full p-20 overflow-visible"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d={pathData}
                fill="none"
                stroke={getStroke(effect)}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={getFilter(effect)}
                className="drawing-path"
                style={{
                  strokeDasharray: 8000,
                  strokeDashoffset: 8000 - (8000 * (progress / 100)),
                  opacity: progress > 0 ? 1 : 0,
                  transition: 'stroke 0.3s ease, filter 0.3s ease'
                }}
              />
            </svg>
          )}

          {/* Prompt to begin */}
          {!image && !isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200 p-8 text-center animate-in fade-in zoom-in duration-700">
              <div className="w-36 h-36 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-inner relative group border-4 border-white">
                <ImageIcon size={64} className="group-hover:scale-110 transition-transform text-slate-100" />
                <div className="absolute -bottom-4 -right-4 bg-indigo-500 p-4 rounded-3xl shadow-xl text-white">
                  <Sparkles size={24} />
                </div>
              </div>
              <h2 className="text-4xl font-serif text-slate-900 mb-4 font-bold tracking-tight">AI One-Line Art</h2>
              <p className="max-w-md text-slate-400 text-xl leading-relaxed font-medium">Upload a memory and watch our AI trace its essence with a single, continuous stroke.</p>
            </div>
          )}
        </div>

        {/* Action Controls for Download/Reset */}
        {pathData && !isProcessing && progress >= 100 && (
          <div className="mt-12 flex items-center gap-6 animate-in slide-in-from-bottom-8 duration-500 ease-out">
            <button 
              onClick={() => { setImage(null); setPathData(null); setVariants({}); setProgress(100); }}
              className="group flex items-center gap-3 px-10 py-5 bg-white text-slate-500 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:text-red-500 hover:shadow-red-500/10 border border-slate-100 transition-all active:scale-95"
            >
              <Trash2 size={20} className="group-hover:rotate-12 transition-transform" /> Start New
            </button>
            <button 
              onClick={downloadPNG}
              className="flex items-center gap-3 px-12 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-indigo-600 hover:-translate-y-2 transition-all active:translate-y-0"
            >
              <Download size={20} /> Export PNG
            </button>
          </div>
        )}
      </main>

      {/* Fullscreen Camera Overlay */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/98 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-2xl">
          <div className="relative w-full max-w-4xl bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.05)] ring-1 ring-white/10">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover aspect-video" />
            <div className="absolute bottom-0 inset-x-0 p-12 flex justify-center items-center gap-20 bg-gradient-to-t from-black to-transparent">
              <button 
                onClick={stopCamera}
                className="w-18 h-18 flex items-center justify-center bg-white/5 text-white rounded-full hover:bg-red-500/20 hover:text-red-400 transition-all backdrop-blur-md"
              >
                <Trash2 size={32} />
              </button>
              <button 
                onClick={capturePhoto}
                className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.4)] border-8 border-white/20 active:scale-90 transition-all hover:scale-105"
              >
                <div className="w-20 h-20 rounded-full border-[6px] border-slate-900" />
              </button>
              <div className="w-18" /> 
            </div>
          </div>
          <p className="text-white/30 mt-10 text-xl font-bold tracking-[0.3em] uppercase">Capture Frame</p>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default App;
