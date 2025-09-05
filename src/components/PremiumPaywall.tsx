import React, { useEffect, useState } from 'react';
import { Check, Crown } from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../App';

interface PremiumPaywallProps {
  currentUser?: User | null;
  onBack?: () => void;
}

export const PremiumPaywall: React.FC<PremiumPaywallProps> = ({ currentUser, onBack }) => {
  const [plans, setPlans] = useState<{ id: string; name: string; priceMonthly: number; perks: string[] }[]>([]);
  const [subscribed, setSubscribed] = useState<string>('free');
  const userId = currentUser?.id || 'u1';

  useEffect(() => {
    api.get<{ ok: boolean; plans: { id: string; name: string; priceMonthly: number; perks: string[] }[] }>(`/billing/plans`).then(d => {
      if (d?.ok) setPlans(d.plans);
    }).catch(() => {});
    api.get<{ ok: boolean; planId: string }>(`/billing/subscription/${userId}`).then(d => {
      if (d?.ok) setSubscribed(d.planId);
    }).catch(() => {});
  }, [userId]);

  const subscribe = async (planId: string) => {
    try {
      await api.post('/billing/subscribe', { userId, planId });
      setSubscribed(planId);
    } catch {}
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Crown className="text-yellow-500" size={20} />
          <h2 className="text-xl font-semibold">Upgrade to Premium</h2>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">Back</button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div key={p.id} className={`border rounded-2xl p-4 ${subscribed===p.id ? 'border-coral' : 'border-gray-200'}`}>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-semibold">{p.name}</h3>
              <div className="text-lg font-bold">{p.priceMonthly === 0 ? 'Free' : `$${p.priceMonthly}/mo`}</div>
            </div>
            <ul className="space-y-2 mb-4">
              {p.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check size={14} className="text-green-600" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            {subscribed === p.id ? (
              <button disabled className="w-full py-2 rounded-lg bg-gray-100 text-gray-500 text-sm">Current plan</button>
            ) : (
              <button onClick={() => subscribe(p.id)} className="w-full py-2 rounded-lg bg-coral text-white text-sm hover:bg-coral/90">Choose {p.name}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
