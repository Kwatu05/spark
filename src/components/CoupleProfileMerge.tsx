import React, { useState } from 'react';
import { HeartHandshake, Mail, Link as LinkIcon, LayoutGrid, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CoupleProfileMerge: React.FC = () => {
  const navigate = useNavigate();
  const [partnerEmail, setPartnerEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <HeartHandshake className="text-coral" size={24} />
          <h1 className="text-lg font-semibold">Create a Couple Profile</h1>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Merge your account with your partner to create a shared profile, joint boards, and a shared calendar.
        </p>

        {!inviteSent ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Partner's email</label>
            <input
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              type="email"
            />
            <button
              onClick={() => setInviteSent(true)}
              className="mt-2 inline-flex items-center space-x-2 px-4 py-2 bg-coral text-white rounded-md"
            >
              <Mail size={16} />
              <span>Send Invite</span>
            </button>
          </div>
        ) : (
          <div className="rounded-md bg-green-50 text-green-800 p-4 text-sm">
            Invite sent to {partnerEmail}. Share this link with them to confirm your couple profile.
            <div className="mt-2 inline-flex items-center space-x-2 px-3 py-1.5 bg-white border border-green-200 rounded">
              <LinkIcon size={14} />
              <span>spark.app/couple/join/abcdef</span>
            </div>
            <div className="mt-4 flex space-x-3">
              <button onClick={() => navigate('/couple/boards')} className="inline-flex items-center space-x-2 px-3 py-2 bg-coral text-white rounded-md text-sm">
                <LayoutGrid size={16} />
                <span>Shared Boards</span>
              </button>
              <button onClick={() => navigate('/couple/milestones')} className="inline-flex items-center space-x-2 px-3 py-2 bg-pink-500 text-white rounded-md text-sm">
                <Calendar size={16} />
                <span>Milestones</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoupleProfileMerge;


