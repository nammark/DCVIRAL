
import React, { useState, useEffect } from 'react';
import { Key, X, Check, ExternalLink, Trash2 } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey, removeStoredApiKey } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredApiKey();
      setSavedKey(stored);
      setApiKey(stored || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      setStoredApiKey(apiKey.trim());
      setSavedKey(apiKey.trim());
      onClose();
    }
  };

  const handleRemove = () => {
    removeStoredApiKey();
    setSavedKey(null);
    setApiKey('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-brand-100 rounded-xl text-brand-600">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Cấu hình API Key</h3>
            <p className="text-sm text-slate-500 font-medium">Kết nối Google Gemini AI</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Trạng thái hiện tại</span>
              {savedKey ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                  <Check className="w-3 h-3" /> Key Cá Nhân
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  <Check className="w-3 h-3" /> Key Hệ Thống (Miễn phí)
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {savedKey 
                ? "Bạn đang sử dụng API Key cá nhân. Giới hạn sử dụng phụ thuộc vào tài khoản của bạn." 
                : "Bạn đang sử dụng API Key miễn phí của hệ thống. Nếu gặp lỗi quá tải, hãy nhập Key riêng của bạn."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nhập Gemini API Key của bạn</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all font-mono text-sm"
            />
          </div>

          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
          >
            Lấy API Key miễn phí tại đây <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex gap-3 pt-2">
            {savedKey && (
              <button 
                onClick={handleRemove}
                className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Xóa Key
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex-grow px-4 py-2.5 bg-royal-900 text-white hover:bg-black rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-royal-900/20"
            >
              Lưu Cấu Hình
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
