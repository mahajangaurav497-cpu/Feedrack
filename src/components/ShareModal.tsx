import { X, Copy, QrCode, Link as LinkIcon, Check } from "lucide-react";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface ShareModalProps {
  survey: any;
  onClose: () => void;
}

export default function ShareModal({ survey, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  
  // The shareable link
  const shareUrl = `${window.location.origin}?surveyId=${survey.id}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="bg-[#1e3c72] p-4 flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2">
            <QrCode className="h-5 w-5" /> Share Feedback Form
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center">
          <p className="text-sm text-slate-500 font-medium text-center mb-6">
            Ask students to scan this QR code or use the link below to access <span className="font-bold text-slate-700">{survey.title}</span>
          </p>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex justify-center w-full">
            <QRCodeSVG value={shareUrl} size={180} />
          </div>
          
          <div className="w-full">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Direct Link</p>
            <div className="flex bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
              <div className="bg-slate-100 px-3 flex items-center justify-center border-r border-slate-200 text-slate-400">
                <LinkIcon className="h-4 w-4" />
              </div>
              <input 
                type="text" 
                readOnly 
                value={shareUrl} 
                className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-600 outline-none"
              />
              <button 
                onClick={copyToClipboard}
                className="bg-[#1e3c72] hover:bg-[#152a51] text-white px-4 flex items-center justify-center transition-colors font-semibold shadow-md active:scale-95"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
