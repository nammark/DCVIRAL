

import React, { useState, useRef, useEffect } from 'react';
import { Slide, ViralContent, StyleConfig, SlideSticker, SignatureConfig, SignatureMode } from '../types';
import { PRESET_BACKGROUNDS, STICKER_PRESETS_LEFT, STICKER_PRESETS_RIGHT, generateSlideImage, DEFAULT_SIGNATURE } from '../utils/canvasUtils';
import { Plus, Trash2, Image as ImageIcon, Copy, Check, ArrowLeft, Palette, Type, Upload, X, ArrowRight, GripHorizontal, Sticker, RefreshCw, Download, UserCircle, LayoutTemplate, Replace, Clipboard, Layers, Hash, Move } from 'lucide-react';

interface Props {
  content: ViralContent;
  onUpdateContent: (content: ViralContent) => void;
  styleConfig: StyleConfig;
  onUpdateStyle: (style: StyleConfig) => void;
  onConfirm: (signature: SignatureConfig) => void;
  onBack: () => void;
  isGeneratingImages: boolean;
  hasResult?: boolean;
  onGoToResult?: () => void;
}

const FONT_OPTIONS = [
    { id: 'Montserrat', name: 'Montserrat (Hiện đại)' },
    { id: 'Merriweather', name: 'Merriweather (Cổ điển)' },
    { id: 'Playfair Display', name: 'Playfair (Sang trọng)' },
    { id: 'Roboto', name: 'Roboto (Trung tính)' },
    { id: 'Open Sans', name: 'Open Sans (Dễ đọc)' },
];

const OVERLAY_COLORS = [
    { name: 'Đen', val: '#000000' },
    { name: 'Trắng', val: '#FFFFFF' },
    { name: 'Xanh Navy', val: '#0c4a6e' },
    { name: 'Vàng', val: '#f59e0b' },
];

const BACKGROUND_SOLID_COLORS = [
    '#ffffff', '#000000', '#f3f4f6', '#1f2937', '#78350f', '#0c4a6e'
];

const StepPlanning: React.FC<Props> = ({ 
    content, 
    onUpdateContent, 
    styleConfig,
    onUpdateStyle,
    onConfirm, 
    onBack, 
    isGeneratingImages,
    hasResult,
    onGoToResult
}) => {
  // Signature State
  const [signatureConfig, setSignatureConfig] = useState<SignatureConfig>(DEFAULT_SIGNATURE);
  
  const [copied, setCopied] = useState(false);
  const [generatingSlideId, setGeneratingSlideId] = useState<string | null>(null);
  
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  const [draggedImageIndex, setDraggedImageIndex] = useState<{slideId: string, imgIndex: number} | null>(null);
  
  // Track which slide/side is being uploaded
  const [activeUpload, setActiveUpload] = useState<{slideId: string, side: 'left' | 'right'} | null>(null);

  // Load Signature from LocalStorage on mount
  useEffect(() => {
      const saved = localStorage.getItem('signatureConfig');
      if (saved) {
          try {
              setSignatureConfig(JSON.parse(saved));
          } catch(e) { console.error('Failed to parse saved signature', e); }
      }
  }, []);

  // Save Signature to LocalStorage on change
  useEffect(() => {
      localStorage.setItem('signatureConfig', JSON.stringify(signatureConfig));
  }, [signatureConfig]);

  // --- AUTO NAVIGATION LOGIC ---
  const applyAutoNavigation = (currentSlides: Slide[]): Slide[] => {
      const contentIndices = currentSlides
          .map((s, idx) => s.type === 'content' ? idx : -1)
          .filter(idx => idx !== -1);
      
      if (contentIndices.length === 0) return currentSlides;

      return currentSlides.map((slide, idx) => {
          if (slide.type === 'intro') {
              return { ...slide, stickerLeft: undefined, stickerRight: undefined };
          }
          
          const isFirstContent = idx === contentIndices[0];
          const isLastContent = idx === contentIndices[contentIndices.length - 1];
          
          let newLeft = slide.stickerLeft;
          let newRight = slide.stickerRight;

          const defaultLeftSticker = { url: STICKER_PRESETS_LEFT[0], label: 'Trước', scale: 0.8, fontSize: 24 };
          const defaultRightSticker = { url: STICKER_PRESETS_RIGHT[0], label: 'Tiếp', scale: 0.8, fontSize: 24 };

          if (isFirstContent) {
              newRight = defaultRightSticker;
              // Preserve manual left sticker if user added it, otherwise undefined
          } else if (isLastContent) {
              newLeft = defaultLeftSticker;
              // Preserve manual right sticker
          } else {
              newLeft = defaultLeftSticker;
              newRight = defaultRightSticker;
          }

          return { ...slide, stickerLeft: newLeft, stickerRight: newRight };
      });
  };

  const handleToggleAutoNav = () => {
      const newValue = !styleConfig.autoNavigation;
      onUpdateStyle({ ...styleConfig, autoNavigation: newValue });
      
      if (newValue) {
          onUpdateContent({ ...content, slides: applyAutoNavigation(content.slides) });
      }
  };

  const updateSlide = (id: string, field: keyof Slide, value: any) => {
    const newSlides = content.slides.map(slide => 
      slide.id === id ? { ...slide, [field]: value } : slide
    );
    onUpdateContent({ ...content, slides: newSlides });
  };

  const removeSlide = (id: string) => {
    if (content.slides.length <= 1) return;
    let newSlides = content.slides.filter(s => s.id !== id);
    if (styleConfig.autoNavigation) {
        newSlides = applyAutoNavigation(newSlides);
    }
    onUpdateContent({ ...content, slides: newSlides });
  };

  const addSlide = () => {
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      type: 'content',
      title: 'Tiêu đề bước mới',
      content: ['Nội dung chi tiết...'],
      images: []
    };
    let newSlides = [...content.slides, newSlide];
    if (styleConfig.autoNavigation) {
        newSlides = applyAutoNavigation(newSlides);
    }
    onUpdateContent({ ...content, slides: newSlides });
  };

  const handleImageUpload = (slideId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const slide = content.slides.find(s => s.id === slideId);
          if (!slide) return;
          const files = Array.from(e.target.files) as File[];
          const currentImages = slide.images || [];
          
          Promise.all(files.map(file => new Promise<string>((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.readAsDataURL(file);
          }))).then(newImages => {
             updateSlide(slideId, 'images', [...currentImages, ...newImages]);
          });
      }
  };

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = () => onUpdateStyle({ 
              ...styleConfig, 
              backgroundId: 'custom', 
              backgroundImageUrl: undefined,
              customBackground: reader.result as string 
          });
          reader.readAsDataURL(e.target.files[0]);
      }
  };
  
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = () => {
              setSignatureConfig({
                  ...signatureConfig,
                  richConfig: {
                      ...signatureConfig.richConfig,
                      avatarUrl: reader.result as string
                  }
              });
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleStickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (activeUpload && e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = () => {
             const slide = content.slides.find(s => s.id === activeUpload.slideId);
             if (slide) {
                 const field = activeUpload.side === 'left' ? 'stickerLeft' : 'stickerRight';
                 const existing = slide[field];
                 
                 const newSticker: SlideSticker = {
                     url: reader.result as string,
                     label: existing?.label || '',
                     scale: existing?.scale || 1.0,
                     fontSize: existing?.fontSize || 24
                 };
                 updateSlide(activeUpload.slideId, field, newSticker);
             }
             setActiveUpload(null);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handlePaste = (slideId: string, e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const slide = content.slides.find(s => s.id === slideId);
      if(!slide) return;
      
      for (const item of items) {
          if (item.type.indexOf("image") !== -1) {
              const blob = item.getAsFile();
              if (blob) {
                  const reader = new FileReader();
                  reader.onload = () => {
                      updateSlide(slideId, 'images', [...(slide.images || []), reader.result as string]);
                  };
                  reader.readAsDataURL(blob);
              }
              e.preventDefault(); 
          }
      }
  };
  
  const handleStickerPaste = (slideId: string, side: 'left' | 'right', e: React.ClipboardEvent) => {
    e.stopPropagation(); // Stop bubbling to slide paste
    const items = e.clipboardData.items;
    
    for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
            const blob = item.getAsFile();
            if (blob) {
                const reader = new FileReader();
                reader.onload = () => {
                    const field = side === 'left' ? 'stickerLeft' : 'stickerRight';
                    const newSticker: SlideSticker = {
                        url: reader.result as string,
                        label: '',
                        scale: 1.0,
                        fontSize: 24
                    };
                    updateSlide(slideId, field, newSticker);
                };
                reader.readAsDataURL(blob);
            }
            e.preventDefault();
        }
    }
  };

  const removeImage = (slideId: string, indexToRemove: number) => {
      const slide = content.slides.find(s => s.id === slideId);
      if (slide) {
          const newImages = slide.images.filter((_, i) => i !== indexToRemove);
          updateSlide(slideId, 'images', newImages);
      }
  };

  const handleDragStart = (e: React.DragEvent, slideId: string, imgIndex: number) => {
    setDraggedImageIndex({ slideId, imgIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetSlideId: string, targetImgIndex: number) => {
    e.preventDefault();
    if (!draggedImageIndex) return;
    if (draggedImageIndex.slideId !== targetSlideId) return;

    const slide = content.slides.find(s => s.id === targetSlideId);
    if (!slide) return;

    const newImages = [...slide.images];
    const [draggedItem] = newImages.splice(draggedImageIndex.imgIndex, 1);
    newImages.splice(targetImgIndex, 0, draggedItem);

    updateSlide(targetSlideId, 'images', newImages);
    setDraggedImageIndex(null);
  };

  const handleGenerateSingleSlide = async (slide: Slide, index: number) => {
      setGeneratingSlideId(slide.id);
      try {
          const url = await generateSlideImage(slide, signatureConfig, styleConfig, index + 1, content.slides.length);
          updateSlide(slide.id, 'generatedImageUrl', url);
      } catch (e) {
          console.error(e);
      } finally {
          setGeneratingSlideId(null);
      }
  };
  
  const downloadSingleSlide = (url: string, index: number) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `slide-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const renderStickerControl = (slide: Slide, side: 'left' | 'right') => {
      const field = side === 'left' ? 'stickerLeft' : 'stickerRight';
      const sticker = slide[field];
      const presets = side === 'left' ? STICKER_PRESETS_LEFT : STICKER_PRESETS_RIGHT;

      return (
          <div 
            className="p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-200"
            tabIndex={0}
            onPaste={(e) => handleStickerPaste(slide.id, side, e)}
          >
              <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                     {side === 'left' ? <ArrowLeft className="w-3 h-3"/> : null} 
                     {side === 'left' ? 'Nhãn/Nút Trái' : 'Nhãn/Nút Phải'}
                     {side === 'right' ? <ArrowRight className="w-3 h-3"/> : null}
                  </span>
                  {sticker && (
                      <button onClick={() => updateSlide(slide.id, field, undefined)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                          <Trash2 className="w-3 h-3" />
                      </button>
                  )}
              </div>

              {/* Upload Button - Clear and Visible */}
              <div className="mb-2">
                   <button
                      onClick={() => {
                          setActiveUpload({ slideId: slide.id, side });
                          stickerInputRef.current?.click();
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 hover:border-brand-500 hover:text-brand-600 text-slate-600 text-xs font-bold py-2 rounded shadow-sm transition-all"
                  >
                      <Upload className="w-3 h-3" /> Tải ảnh lên
                  </button>
              </div>

              {/* Presets Grid */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar">
                  {presets.map((url, idx) => (
                      <button
                          key={idx}
                          onClick={() => updateSlide(slide.id, field, { ...sticker, url, scale: sticker?.scale || 0.8, fontSize: sticker?.fontSize || 24 })}
                          className={`flex-shrink-0 w-8 h-8 rounded border ${sticker?.url === url ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'} flex items-center justify-center hover:border-brand-300 p-1`}
                          title="Chọn mẫu có sẵn"
                      >
                          <img src={url} alt="Sticker" className="w-full h-full object-contain" />
                      </button>
                  ))}
              </div>

              {/* Label & Separate Scale Controls */}
              {sticker && (
                  <div className="flex flex-col gap-2">
                      <input 
                          type="text" 
                          value={sticker.label || ''}
                          onChange={(e) => updateSlide(slide.id, field, { ...sticker, label: e.target.value })}
                          placeholder={`Nhãn (VD: ${side === 'left' ? 'Trước' : 'Tiếp'})`}
                          className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded focus:border-brand-500 outline-none"
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                          {/* Image Scale */}
                          <div className="flex flex-col">
                              <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] text-slate-400 font-bold">Cỡ Ảnh</span>
                                  <span className="text-[10px] text-slate-400">{sticker.scale || 1.0}x</span>
                              </div>
                              <input 
                                  type="range" 
                                  min="0.5" 
                                  max="2.0" 
                                  step="0.1" 
                                  value={sticker.scale || 1.0}
                                  onChange={(e) => updateSlide(slide.id, field, { ...sticker, scale: parseFloat(e.target.value) })}
                                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                              />
                          </div>

                          {/* Font Size */}
                          <div className="flex flex-col">
                               <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] text-slate-400 font-bold">Cỡ Chữ</span>
                                  <span className="text-[10px] text-slate-400">{sticker.fontSize || 24}px</span>
                              </div>
                              <input 
                                  type="range" 
                                  min="12" 
                                  max="60" 
                                  step="2" 
                                  value={sticker.fontSize || 24}
                                  onChange={(e) => updateSlide(slide.id, field, { ...sticker, fontSize: parseInt(e.target.value) })}
                                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                              />
                          </div>
                      </div>
                  </div>
              )}
              
              {!sticker && (
                  <div className="text-[10px] text-slate-400 text-center italic">
                      Dán ảnh (Ctrl+V) hoặc chọn ảnh
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 animate-fade-in">
      
      {/* Hidden Inputs */}
      <input type="file" ref={bgFileInputRef} onChange={handleCustomBgUpload} className="hidden" accept="image/*" />
      <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
      <input type="file" ref={stickerInputRef} onChange={handleStickerUpload} className="hidden" accept="image/*" />

      {/* --- LEFT PANEL: CONFIG --- */}
      <div className="lg:w-80 flex-shrink-0 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-brand-500" />
                Giao diện & Chữ ký
            </h3>
            
            {/* Background */}
            <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Hình Nền</label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                    {PRESET_BACKGROUNDS.map((url, idx) => (
                        <button
                            key={idx}
                            onClick={() => onUpdateStyle({ ...styleConfig, backgroundId: `preset-${idx}`, backgroundImageUrl: url })}
                            className={`w-full aspect-square rounded-lg border-2 overflow-hidden hover:opacity-80 transition-all ${styleConfig.backgroundId === `preset-${idx}` ? 'border-brand-500 ring-2 ring-brand-200' : 'border-transparent'}`}
                        >
                            <img src={url} alt="Bg" className="w-full h-full object-cover" />
                        </button>
                    ))}
                    
                    {/* Custom Upload Button */}
                    <button
                        onClick={() => bgFileInputRef.current?.click()}
                        className={`w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden transition-all ${styleConfig.backgroundId === 'custom' ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400'}`}
                    >
                         {styleConfig.customBackground ? (
                             <>
                                <img src={styleConfig.customBackground} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <Replace className="w-5 h-5 text-white drop-shadow-md" />
                                </div>
                             </>
                         ) : (
                            <Upload className="w-5 h-5 text-slate-400" />
                         )}
                    </button>
                </div>

                {/* Solid Colors */}
                <div className="mt-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-400">Hoặc màu đơn sắc</span>
                        <div className="flex items-center gap-2">
                             <input 
                                type="color" 
                                value={styleConfig.backgroundColor || '#ffffff'}
                                onChange={(e) => onUpdateStyle({ ...styleConfig, backgroundId: 'solid', backgroundColor: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border-0 p-0 overflow-hidden"
                             />
                             <span className="text-xs font-mono text-slate-500">{styleConfig.backgroundColor}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {BACKGROUND_SOLID_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => onUpdateStyle({ ...styleConfig, backgroundId: 'solid', backgroundColor: color })}
                                className={`w-8 h-8 rounded-full border shadow-sm ${styleConfig.backgroundId === 'solid' && styleConfig.backgroundColor === color ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Overlay */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                     <label className="text-xs font-bold text-slate-500 uppercase">Lớp Phủ (Overlay)</label>
                     <span className="text-xs font-mono bg-slate-100 px-1 rounded">{styleConfig.overlayOpacity || 0}%</span>
                </div>
                <div className="flex gap-2 mb-2">
                    {OVERLAY_COLORS.map(c => (
                        <button
                            key={c.name}
                            onClick={() => onUpdateStyle({ ...styleConfig, overlayColor: c.val, overlayOpacity: styleConfig.overlayOpacity === 0 ? 30 : styleConfig.overlayOpacity })}
                            className={`w-6 h-6 rounded-full border ${styleConfig.overlayColor === c.val ? 'ring-1 ring-offset-1 ring-slate-400' : ''}`}
                            style={{ backgroundColor: c.val }}
                            title={c.name}
                        />
                    ))}
                    <input 
                        type="color"
                        value={styleConfig.overlayColor || '#000000'}
                        onChange={(e) => onUpdateStyle({ ...styleConfig, overlayColor: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                    />
                </div>
                <input 
                    type="range" min="0" max="90" step="5"
                    value={styleConfig.overlayOpacity || 0}
                    onChange={(e) => onUpdateStyle({ ...styleConfig, overlayOpacity: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
            </div>

            {/* Fonts */}
            <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Font Chữ</label>
                <div className="space-y-2">
                    <select 
                        value={styleConfig.titleFont}
                        onChange={(e) => onUpdateStyle({ ...styleConfig, titleFont: e.target.value })}
                        className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                    >
                        {FONT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Slide Settings (Numbering & Auto Nav) */}
            <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Cài đặt Slide
                </h4>
                
                {/* Numbering */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Đánh số trang</span>
                    <button 
                        onClick={() => onUpdateStyle({ ...styleConfig, showSlideNumbers: !styleConfig.showSlideNumbers })}
                        className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ${styleConfig.showSlideNumbers ? 'bg-brand-500' : 'bg-slate-300'}`}
                    >
                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ${styleConfig.showSlideNumbers ? 'translate-x-5' : ''}`}></div>
                    </button>
                </div>
                {styleConfig.showSlideNumbers && (
                    <div className="mb-3">
                        <label className="text-[10px] font-bold text-slate-400 mb-1 block">Vị trí số</label>
                        <select 
                            value={styleConfig.slideNumberPosition || 'top-right'}
                            onChange={(e) => onUpdateStyle({ ...styleConfig, slideNumberPosition: e.target.value as any })}
                            className="w-full text-xs p-2 border border-slate-200 rounded bg-white focus:border-brand-500 outline-none"
                        >
                            <option value="top-right">Góc trên phải (Mặc định)</option>
                            <option value="top-left">Góc trên trái</option>
                            <option value="bottom-right">Góc dưới phải</option>
                            <option value="bottom-left">Góc dưới trái</option>
                        </select>
                    </div>
                )}
                
                {/* Auto Nav */}
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Tự động điều hướng</span>
                    <button 
                        onClick={handleToggleAutoNav}
                        className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ${styleConfig.autoNavigation ? 'bg-brand-500' : 'bg-slate-300'}`}
                    >
                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ${styleConfig.autoNavigation ? 'translate-x-5' : ''}`}></div>
                    </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Tự động thêm nút Trước/Tiếp vào đúng vị trí.</p>
            </div>

            {/* Signature */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Chữ ký chân trang</label>
                
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
                    <button 
                        onClick={() => setSignatureConfig({...signatureConfig, mode: 'simple'})}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${signatureConfig.mode === 'simple' ? 'bg-white shadow text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Đơn giản
                    </button>
                    <button 
                        onClick={() => setSignatureConfig({...signatureConfig, mode: 'rich'})}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${signatureConfig.mode === 'rich' ? 'bg-white shadow text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Pro (Ảnh + Tên)
                    </button>
                </div>

                {signatureConfig.mode === 'simple' ? (
                    <input 
                        type="text" 
                        value={signatureConfig.simpleText}
                        onChange={(e) => setSignatureConfig({...signatureConfig, simpleText: e.target.value})}
                        className="w-full text-sm p-2 border border-slate-200 rounded focus:border-brand-500 outline-none"
                        placeholder="@MyBrand"
                    />
                ) : (
                    <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {/* Avatar */}
                        <div className="flex items-center gap-3">
                            <div onClick={() => avatarInputRef.current?.click()} className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 hover:border-brand-500 cursor-pointer overflow-hidden relative group">
                                <img src={signatureConfig.richConfig.avatarUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <div className="flex-grow">
                                <p className="text-xs font-bold text-slate-500 mb-1">Ảnh đại diện</p>
                                <button onClick={() => avatarInputRef.current?.click()} className="text-xs text-brand-600 font-semibold hover:underline">Tải ảnh lên</button>
                            </div>
                        </div>

                        {/* Name & Tick */}
                        <div className="flex gap-2">
                             <input 
                                type="text"
                                value={signatureConfig.richConfig.name}
                                onChange={(e) => setSignatureConfig({...signatureConfig, richConfig: {...signatureConfig.richConfig, name: e.target.value}})}
                                className="flex-grow text-sm p-2 border border-slate-200 rounded focus:border-brand-500 outline-none"
                                placeholder="Tên hiển thị"
                             />
                             <button 
                                onClick={() => setSignatureConfig({...signatureConfig, richConfig: {...signatureConfig.richConfig, isVerified: !signatureConfig.richConfig.isVerified}})}
                                className={`p-2 rounded border ${signatureConfig.richConfig.isVerified ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-300'}`}
                                title="Hiện tích xanh"
                             >
                                 <Check className="w-4 h-4" />
                             </button>
                        </div>
                        
                        {/* Tagline */}
                        <input 
                            type="text"
                            value={signatureConfig.richConfig.tagline}
                            onChange={(e) => setSignatureConfig({...signatureConfig, richConfig: {...signatureConfig.richConfig, tagline: e.target.value}})}
                            className="w-full text-sm p-2 border border-slate-200 rounded focus:border-brand-500 outline-none"
                            placeholder="Chức danh / Slogan"
                        />
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: SLIDES --- */}
      <div className="flex-grow space-y-8">
        <div className="flex items-center justify-between">
            <h3 className="text-2xl font-extrabold text-slate-800 font-display">Chỉnh sửa nội dung ({content.slides.length} slides)</h3>
            <div className="flex items-center gap-3">
                 <button onClick={onBack} className="text-slate-500 hover:text-slate-800 font-bold text-sm px-4 py-2">
                    Quay lại
                 </button>
                 <button 
                    onClick={() => onConfirm(signatureConfig)}
                    disabled={isGeneratingImages}
                    className="bg-royal-900 text-white hover:bg-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-royal-900/20 transition-all disabled:opacity-50"
                 >
                    {isGeneratingImages ? <RefreshCw className="w-4 h-4 animate-spin"/> : <SparklesIcon className="w-4 h-4" />}
                    {isGeneratingImages ? 'Đang vẽ...' : 'Xuất tất cả ảnh'}
                 </button>
            </div>
        </div>

        <div className="space-y-6">
            {content.slides.map((slide, idx) => (
                <div key={slide.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md relative group">
                    {/* Header: Slide Info & Actions */}
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-100 text-slate-500 font-bold px-3 py-1 rounded text-xs uppercase tracking-wider">
                                {slide.type === 'intro' ? 'Trang bìa' : `Slide ${idx + 1}`}
                            </span>
                            {/* Slide Type Selector */}
                            {idx !== 0 && (
                                <select 
                                    value={slide.type}
                                    onChange={(e) => updateSlide(slide.id, 'type', e.target.value)}
                                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 focus:border-brand-500 outline-none text-slate-600"
                                >
                                    <option value="content">Nội dung</option>
                                    <option value="intro">Tiêu đề lớn</option>
                                </select>
                            )}
                        </div>
                        <button onClick={() => removeSlide(slide.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors" title="Xóa slide">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Column 1: Content Edit */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tiêu đề Slide</label>
                                <textarea
                                    value={slide.title}
                                    onChange={(e) => updateSlide(slide.id, 'title', e.target.value)}
                                    className="w-full text-lg font-bold text-slate-800 p-3 bg-slate-50 border-2 border-transparent focus:bg-white focus:border-brand-500 rounded-xl outline-none transition-all resize-none shadow-sm"
                                    rows={2}
                                />
                            </div>

                            {/* Bullet Points */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nội dung chi tiết</label>
                                {slide.content.map((point, pIdx) => (
                                    <div key={pIdx} className="flex gap-2">
                                        <div className="flex-grow relative">
                                            <div className="absolute top-3 left-3 w-1.5 h-1.5 bg-brand-400 rounded-full"></div>
                                            <textarea
                                                value={point}
                                                onChange={(e) => {
                                                    const newContent = [...slide.content];
                                                    newContent[pIdx] = e.target.value;
                                                    updateSlide(slide.id, 'content', newContent);
                                                }}
                                                className="w-full p-2 pl-7 bg-white text-slate-700 border border-slate-200 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-200 outline-none text-sm leading-relaxed resize-y min-h-[44px]"
                                                rows={Math.max(1, Math.ceil(point.length / 40))}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newContent = slide.content.filter((_, i) => i !== pIdx);
                                                updateSlide(slide.id, 'content', newContent);
                                            }}
                                            className="text-slate-300 hover:text-red-400 p-1"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => updateSlide(slide.id, 'content', [...slide.content, ''])}
                                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-2 px-2 py-1 rounded hover:bg-brand-50 w-fit transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Thêm ý
                                </button>
                            </div>
                        </div>

                        {/* Column 2: Visuals */}
                        <div className="space-y-4">
                            {/* Images Area */}
                            <div 
                                className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 hover:border-brand-300 transition-colors"
                                onPaste={(e) => handlePaste(slide.id, e)}
                                tabIndex={0}
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" /> Hình minh họa
                                    </label>
                                    <button 
                                        onClick={() => document.getElementById(`img-upload-${slide.id}`)?.click()}
                                        className="text-xs bg-white border border-slate-200 px-2 py-1 rounded shadow-sm hover:border-brand-400 text-slate-600 font-medium"
                                    >
                                        + Tải ảnh
                                    </button>
                                    <input 
                                        id={`img-upload-${slide.id}`}
                                        type="file" 
                                        multiple 
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(slide.id, e)}
                                    />
                                </div>
                                
                                {(!slide.images || slide.images.length === 0) ? (
                                    <div className="text-center py-6 text-slate-400 text-sm">
                                        <p>Kéo thả hoặc dán ảnh (Ctrl+V) vào đây</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {slide.images.map((img, imgIdx) => (
                                            <div 
                                                key={imgIdx} 
                                                className="relative aspect-square rounded-lg overflow-hidden group shadow-sm bg-white cursor-move"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, slide.id, imgIdx)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, slide.id, imgIdx)}
                                            >
                                                <img src={img} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <GripHorizontal className="text-white/70 w-5 h-5" />
                                                </div>
                                                <button 
                                                    onClick={() => removeImage(slide.id, imgIdx)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Stickers Section */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    {renderStickerControl(slide, 'left')}
                                </div>
                                <div>
                                    {renderStickerControl(slide, 'right')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer: Single Slide Generation */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center justify-center gap-4 bg-slate-50/50 rounded-xl p-4">
                        {!slide.generatedImageUrl ? (
                            <button
                                onClick={() => handleGenerateSingleSlide(slide, idx)}
                                disabled={generatingSlideId === slide.id}
                                className="text-slate-500 hover:text-brand-600 text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                            >
                                {generatingSlideId === slide.id ? <RefreshCw className="w-4 h-4 animate-spin"/> : <LayoutTemplate className="w-4 h-4"/>}
                                Vẽ thử & Xem trước Slide này
                            </button>
                        ) : (
                            <div className="w-full flex flex-col items-center animate-fade-in">
                                <div className="relative group w-full max-w-[300px] shadow-lg rounded-xl overflow-hidden border border-slate-200 mb-3">
                                    <img src={slide.generatedImageUrl} alt="Preview" className="w-full h-auto" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                         <button 
                                            onClick={() => downloadSingleSlide(slide.generatedImageUrl!, idx)}
                                            className="bg-white text-slate-900 p-2 rounded-full hover:scale-110 transition-transform"
                                            title="Tải ảnh"
                                         >
                                             <Download className="w-5 h-5"/>
                                         </button>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleGenerateSingleSlide(slide, idx)}
                                        disabled={generatingSlideId === slide.id}
                                        className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${generatingSlideId === slide.id ? 'animate-spin' : ''}`}/> Làm mới
                                    </button>
                                    <button
                                        onClick={() => downloadSingleSlide(slide.generatedImageUrl!, idx)}
                                        className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
                                    >
                                        <Download className="w-3 h-3"/> Tải xuống
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            ))}
            
            <button 
                onClick={addSlide}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
            >
                <Plus className="w-5 h-5" /> Thêm Slide Mới
            </button>
        </div>
      </div>
    </div>
  );
};

// Helper Icon
const SparklesIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);

export default StepPlanning;
