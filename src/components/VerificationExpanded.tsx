import React, { useState, useEffect } from 'react';
import { Camera, BadgeCheck, Link as LinkIcon, CheckCircle, Upload, AlertCircle, Clock, X } from 'lucide-react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export const VerificationExpanded: React.FC = () => {
  const navigate = useNavigate();
  const [selfieDone, setSelfieDone] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string>('');
  const [idDone, setIdDone] = useState(false);
  const [idDocumentUrl, setIdDocumentUrl] = useState<string>('');
  const [socials, setSocials] = useState({ instagram: '', twitter: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // Check verification status on component mount
  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await api.get<{ok: boolean; isVerified: boolean; latestRequest: any; canSubmitNew: boolean}>('/verification/status');
      if (response.ok) {
        setVerificationStatus(response);
      }
    } catch (error) {
      console.error('Failed to check verification status:', error);
    }
  };

  const complete = selfieDone && (idDone || socials.instagram || socials.twitter);

  const handleSubmit = async () => {
    if (!complete) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await api.post<{ok: boolean; error?: string; message?: string}>('/verification/submit', {
        selfieUrl,
        idDocumentUrl: idDone ? idDocumentUrl : null,
        socialLinks: {
          instagram: socials.instagram || null,
          twitter: socials.twitter || null
        }
      });
      
      if (response.ok) {
        alert('Verification request submitted successfully! Our team will review it within 24-48 hours.');
        navigate('/profile');
      } else {
        setError(response.error || 'Failed to submit verification request');
      }
    } catch (error) {
      setError('Failed to submit verification request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is already verified, show success state
  if (verificationStatus?.isVerified) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">You're Verified!</h1>
            <p className="text-sm text-gray-600">Your account has been verified with a blue checkmark.</p>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="w-full py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  // If user has a pending request, show status
  if (verificationStatus?.latestRequest?.status === 'PENDING') {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Verification Pending</h1>
            <p className="text-sm text-gray-600">
              Your verification request is being reviewed. We'll notify you once it's processed.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Submitted: {new Date(verificationStatus.latestRequest.submittedAt).toLocaleDateString()}
            </p>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  // If user has a rejected request, show rejection reason
  if (verificationStatus?.latestRequest?.status === 'REJECTED') {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Verification Rejected</h1>
            <p className="text-sm text-gray-600 mb-2">
              Your verification request was not approved.
            </p>
            {verificationStatus.latestRequest.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                <p className="text-sm text-red-800">
                  <strong>Reason:</strong> {verificationStatus.latestRequest.rejectionReason}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => {
                setVerificationStatus(null);
                setSelfieDone(false);
                setIdDone(false);
                setSocials({ instagram: '', twitter: '' });
                setError('');
              }}
              className="w-full py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Back to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Get Verified</h1>
          <p className="text-sm text-gray-600">Get a blue checkmark to show you're authentic. Our team will review your submission.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Camera size={18} className="text-coral" />
                <span className="font-medium">Selfie Liveness</span>
              </div>
              <label className="px-3 py-1.5 rounded-full text-xs bg-gray-100 inline-flex items-center cursor-pointer">
                <Upload size={14} className="mr-1" /> Upload Selfie
                <input type="file" accept="image/*" className="hidden" onChange={(e)=>{
                  const f=e.target.files?.[0];
                  if(!f) return; const reader=new FileReader();
                  reader.onload=(ev)=>{ const url=String(ev.target?.result||''); setSelfieUrl(url); setSelfieDone(true); };
                  reader.readAsDataURL(f);
                }} />
              </label>
            </div>
            {selfieUrl ? (
              <div className="mt-2">
                <img src={selfieUrl} alt="Selfie preview" className="w-24 h-24 rounded-full object-cover ring-2 ring-coral/20" />
                <p className="text-xs text-green-700 bg-green-50 inline-block px-2 py-0.5 rounded ml-2">Selfie captured</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Upload a clear photo of your face. Liveness check is simulated.</p>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <BadgeCheck size={18} className="text-coral" />
                <span className="font-medium">Government ID (optional)</span>
              </div>
              <label className="px-3 py-1.5 rounded-full text-xs bg-gray-100 inline-flex items-center cursor-pointer">
                <Upload size={14} className="mr-1" /> Upload ID
                <input type="file" accept="image/*" className="hidden" onChange={(e)=>{
                  const f=e.target.files?.[0];
                  if(!f) return; const reader=new FileReader();
                  reader.onload=(ev)=>{ const url=String(ev.target?.result||''); setIdDocumentUrl(url); setIdDone(true); };
                  reader.readAsDataURL(f);
                }} />
              </label>
            </div>
            {idDocumentUrl ? (
              <div className="mt-2">
                <img src={idDocumentUrl} alt="ID document preview" className="w-32 h-20 rounded object-cover ring-2 ring-coral/20" />
                <p className="text-xs text-green-700 bg-green-50 inline-block px-2 py-0.5 rounded ml-2">ID uploaded</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Upload a clear photo of your government-issued ID (driver's license, passport, etc.)</p>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <LinkIcon size={18} className="text-coral" />
              <span className="font-medium">Social Links</span>
            </div>
            <div className="space-y-2">
              <input value={socials.instagram} onChange={(e)=>setSocials({...socials, instagram:e.target.value})} placeholder="Instagram URL" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              <input value={socials.twitter} onChange={(e)=>setSocials({...socials, twitter:e.target.value})} placeholder="Twitter/X URL" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <button 
          disabled={!complete || isSubmitting} 
          onClick={handleSubmit}
          className={`w-full py-3 rounded-xl font-semibold transition-colors ${
            complete && !isSubmitting 
              ? 'bg-coral text-white hover:bg-coral/90' 
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <span className="inline-flex items-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Submitting...
            </span>
          ) : complete ? (
            <span className="inline-flex items-center">
              <CheckCircle size={18} className="mr-2"/> Submit for Review
            </span>
          ) : (
            'Complete steps to submit'
          )}
        </button>
      </div>
    </div>
  );
};

export default VerificationExpanded;


