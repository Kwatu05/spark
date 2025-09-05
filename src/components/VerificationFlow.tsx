import React from 'react';
import { BadgeCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const VerificationFlow: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 text-center">
        <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto">
          <BadgeCheck className="w-8 h-8 text-coral" />
        </div>
        
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Get Verified</h1>
          <p className="text-sm text-gray-600 mb-4">
            Get a blue checkmark to show you're authentic and build trust with other users.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3">
          <h3 className="font-medium text-gray-900">What you'll need:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• A clear selfie photo</li>
            <li>• Government ID (optional but recommended)</li>
            <li>• Social media links (optional)</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Our team will review your submission within 24-48 hours. 
            You'll be notified once your verification is processed.
          </p>
        </div>

        <button 
          onClick={() => navigate('/verify/expanded')}
          className="w-full py-3 bg-coral text-white rounded-xl font-semibold hover:bg-coral/90 transition-colors flex items-center justify-center gap-2"
        >
          Start Verification Process
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default VerificationFlow;