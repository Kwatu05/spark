import React, { useState } from 'react';
import { Mail, Phone, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AuthVerification: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'phone' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [codeEmail, setCodeEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [codePhone, setCodePhone] = useState('');

  const finish = () => {
    try { localStorage.setItem('signup_verified', '1'); } catch {}
    // Establish session post-verification
    try { localStorage.setItem('spark_session', '1'); } catch {}
    navigate('/feed');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
          <h1 className="text-lg font-semibold">Verify your account</h1>

          {step === 'email' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-gray-700"><Mail size={18} className="text-coral" /><span>Email verification</span></div>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <div className="flex items-center space-x-2">
                <input value={codeEmail} onChange={e => setCodeEmail(e.target.value)} placeholder="Enter code" className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm" />
                <button className="px-3 py-2 bg-gray-100 rounded-md text-sm">Send Code</button>
              </div>
              <button onClick={() => setStep('phone')} className="w-full py-2 bg-coral text-white rounded-md font-medium">Continue</button>
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-gray-700"><Phone size={18} className="text-coral" /><span>Phone verification</span></div>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
              <div className="flex items-center space-x-2">
                <input value={codePhone} onChange={e => setCodePhone(e.target.value)} placeholder="Enter SMS code" className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm" />
                <button className="px-3 py-2 bg-gray-100 rounded-md text-sm">Send Code</button>
              </div>
              <button onClick={() => setStep('done')} className="w-full py-2 bg-coral text-white rounded-md font-medium">Verify</button>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <p className="text-sm text-gray-700">You're verified! Let's get you started.</p>
              <button onClick={finish} className="w-full py-2 bg-coral text-white rounded-md font-medium">Continue to app</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthVerification;


