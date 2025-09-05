import React, { useState } from 'react';
import { Heart, Mail, Lock, MapPin, Briefcase, Calendar } from 'lucide-react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { trackEvent, getExperimentAssignment } from '../lib/experiments';

interface AuthModalProps {}

export const AuthModal: React.FC<AuthModalProps> = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  // Get CTA button experiment
  const ctaExperiment = getExperimentAssignment('cta_button');
  const ctaText = ctaExperiment?.variant === 'connect' ? 'Connect' : 'Spark';
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [age, setAge] = useState<number | ''>('');
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [workStatus, setWorkStatus] = useState('');
  const [isStudent, setIsStudent] = useState<boolean>(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        const response = await api.post<{ok: boolean; accessToken?: string; user?: {role: string}; error?: string}>('/auth/login', { username, password });
        if (response.ok && response.accessToken) {
          localStorage.setItem('access_token', response.accessToken);
          localStorage.setItem('spark_session', '1');
          
                        // Redirect based on user role
              if (response.user?.role === 'ADMIN' || response.user?.role === 'MODERATOR') {
                navigate('/admin');
              } else {
                navigate('/profile'); // Regular users go to profile dashboard
              }
        } else {
          throw new Error(response.error || 'Login failed');
        }
      } else {
        // Basic client-side validation
        if (!fullName.trim()) throw new Error('Full name is required');
        if (!username.trim()) throw new Error('Username is required');
        if (!gender) throw new Error('Please select a gender');
        const numericAge = typeof age === 'string' ? parseInt(age) : age;
        if (!numericAge || numericAge < 18) throw new Error('You must be 18 or older');
        if (!acceptedTerms) throw new Error('You must accept the Terms & Conditions');
        // Sign up path → send payload, then go to onboarding
        await api.post('/auth/signup', {
          fullName,
          username,
          email,
          phone,
          password,
          gender,
          age: numericAge,
          relationshipStatus,
          workStatus,
          isStudent,
          acceptedTerms
        });
        trackEvent('user_signup', { 
          gender, 
          age: numericAge, 
          relationshipStatus,
          workStatus,
          isStudent 
        });
        navigate('/onboarding');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-coral to-warm-pink flex items-center justify-center">
            <Heart size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-semibold">Welcome to Spark</h2>
        </div>

        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded-lg font-medium ${isLogin ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Log In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded-lg font-medium ${!isLogin ? 'bg-coral text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full name"
                  className="px-3 py-2 bg-gray-100 rounded-xl text-sm"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Username"
                  className="px-3 py-2 bg-gray-100 rounded-xl text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center space-x-3 bg-gray-100 rounded-xl px-3 py-2">
                  <Mail size={18} className="text-gray-500" />
                  <input
                    type="email"
                    placeholder="Email"
                    className="flex-1 bg-transparent outline-none text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <input
                  type="tel"
                  placeholder="Phone number"
                  className="px-3 py-2 bg-gray-100 rounded-xl text-sm"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select value={gender} onChange={(e)=>setGender(e.target.value as any)} className="px-3 py-2 bg-gray-100 rounded-xl text-sm">
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <input
                  type="number"
                  placeholder="Age (18+)"
                  min={18}
                  className="px-3 py-2 bg-gray-100 rounded-xl text-sm"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                />
                <select value={relationshipStatus} onChange={(e)=>setRelationshipStatus(e.target.value)} className="px-3 py-2 bg-gray-100 rounded-xl text-sm">
                  <option value="">Status</option>
                  <option value="single">Single</option>
                  <option value="dating">Dating</option>
                  <option value="engaged">Engaged</option>
                  <option value="married">Married</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select value={workStatus} onChange={(e)=>setWorkStatus(e.target.value)} className="px-3 py-2 bg-gray-100 rounded-xl text-sm">
                  <option value="">Work status</option>
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self-employed</option>
                  <option value="seeking">Seeking</option>
                  <option value="other">Other</option>
                </select>
                <label className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-xl text-sm">
                  <input type="checkbox" checked={isStudent} onChange={(e)=>setIsStudent(e.target.checked)} />
                  <span>Student</span>
                </label>
                <label className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-xl text-sm">
                  <input type="checkbox" checked={acceptedTerms} onChange={(e)=>setAcceptedTerms(e.target.checked)} />
                  <span>I accept the <button type="button" className="underline text-coral">Terms & Conditions</button></span>
                </label>
              </div>
            </>
          )}

          {isLogin && (
            <div className="flex items-center space-x-3 bg-gray-100 rounded-xl px-3 py-2">
              <Mail size={18} className="text-gray-500" />
              <input
                type="text"
                placeholder="Username"
                className="flex-1 bg-transparent outline-none text-sm"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center space-x-3 bg-gray-100 rounded-xl px-3 py-2">
            <Lock size={18} className="text-gray-500" />
            <input
              type="password"
              placeholder="Password"
              className="flex-1 bg-transparent outline-none text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-coral to-warm-pink text-white font-semibold rounded-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60"
          >
            {loading ? 'Please wait...' : isLogin ? 'Log In' : `Create Account with ${ctaText}`}
          </button>
        </form>

        <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-gray-500">
          <div className="flex items-center space-x-1"><MapPin size={14} /> <span>Discover Nearby</span></div>
          <div className="flex items-center space-x-1"><Briefcase size={14} /> <span>Pro Profiles</span></div>
          <div className="flex items-center space-x-1"><Calendar size={14} /> <span>Moments & Dates</span></div>
        </div>
      </div>
    </div>
  );
}