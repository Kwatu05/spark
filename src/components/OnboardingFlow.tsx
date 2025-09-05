import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Heart, Camera } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    photos: [] as string[],
    interests: [] as string[],
    preferences: {
      ageRange: [22, 35],
      distance: 25,
      lookingFor: ''
    }
  });

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Spark! ✨',
      subtitle: 'Let\'s set up your profile to help you make meaningful connections',
      component: WelcomeStep
    },
    {
      id: 'photos',
      title: 'Add Your Best Photos',
      subtitle: 'Show your personality through authentic moments',
      component: PhotosStep
    },
    {
      id: 'interests',
      title: 'What Are You Into?',
      subtitle: 'Help us find people who share your passions',
      component: InterestsStep
    },
    {
      id: 'preferences',
      title: 'Set Your Preferences',
      subtitle: 'Tell us what you\'re looking for',
      component: PreferencesStep
    },
    {
      id: 'complete',
      title: 'You\'re All Set! 🎉',
      subtitle: 'Start exploring and making connections',
      component: CompleteStep
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-coral via-warm-pink to-sunset flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div 
            className="h-full bg-gradient-to-r from-coral to-warm-pink transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {steps[currentStep].title}
            </h1>
            <p className="text-gray-600">
              {steps[currentStep].subtitle}
            </p>
          </div>

          <CurrentStepComponent 
            formData={formData}
            setFormData={setFormData}
            onNext={nextStep}
          />

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-coral' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextStep}
              className="flex items-center space-x-2 px-6 py-2 bg-coral text-white rounded-full font-semibold hover:bg-coral/90 transition-colors"
            >
              <span>{currentStep === steps.length - 1 ? 'Start Sparking' : 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
const WelcomeStep: React.FC<any> = () => (
  <div className="text-center py-8">
    <div className="w-24 h-24 bg-gradient-to-r from-coral to-warm-pink rounded-full mx-auto mb-6 flex items-center justify-center">
      <Heart size={40} className="text-white" />
    </div>
    <div className="space-y-4 text-gray-700">
      <p>• Share authentic moments from your life</p>
      <p>• Connect through shared interests and activities</p>
      <p>• Only message after mutual Sparks</p>
      <p>• Build meaningful connections, not just matches</p>
    </div>
  </div>
);

const PhotosStep: React.FC<any> = ({ formData, setFormData }) => {
  const addPhoto = () => {
    const newPhoto = `https://images.pexels.com/photos/${Math.floor(Math.random() * 1000000)}/pexels-photo-${Math.floor(Math.random() * 1000000)}.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop`;
    setFormData({
      ...formData,
      photos: [...formData.photos, newPhoto]
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            {formData.photos[index] ? (
              <img src={formData.photos[index]} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <button onClick={addPhoto} className="w-full h-full flex flex-col items-center justify-center hover:bg-gray-50 transition-colors">
                <Camera size={20} className="text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Add Photo</span>
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-600 text-center">
        Add at least 3 photos to continue. Show your personality!
      </p>
    </div>
  );
};

const InterestsStep: React.FC<any> = ({ formData, setFormData }) => {
  const interests = [
    'Hiking', 'Photography', 'Coffee', 'Travel', 'Art', 'Yoga', 'Cooking', 'Wine',
    'Food', 'Jazz', 'Cycling', 'Dancing', 'Music', 'Culture', 'Festivals',
    'Rock Climbing', 'Technology', 'Sustainability', 'Fitness', 'Reading',
    'Theater', 'Museums', 'Beach', 'Skiing', 'Gaming'
  ];

  const toggleInterest = (interest: string) => {
    const current = formData.interests;
    if (current.includes(interest)) {
      setFormData({
        ...formData,
        interests: current.filter((i: string) => i !== interest)
      });
    } else if (current.length < 10) {
      setFormData({
        ...formData,
        interests: [...current, interest]
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {interests.map((interest) => (
          <button
            key={interest}
            onClick={() => toggleInterest(interest)}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              formData.interests.includes(interest)
                ? 'bg-coral text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {interest}
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-600 text-center">
        Select up to 10 interests ({formData.interests.length}/10)
      </p>
    </div>
  );
};

const PreferencesStep: React.FC<any> = ({ formData, setFormData }) => {
  const lookingForOptions = ['Long-term', 'Short-term', 'Friends', 'Casual', 'Not sure'];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">What are you looking for?</label>
        <div className="grid grid-cols-2 gap-2">
          {lookingForOptions.map((option) => (
            <button
              key={option}
              onClick={() => setFormData({
                ...formData,
                preferences: { ...formData.preferences, lookingFor: option }
              })}
              className={`p-3 rounded-xl border-2 font-medium transition-colors ${
                formData.preferences.lookingFor === option
                  ? 'border-coral bg-coral text-white'
                  : 'border-gray-200 text-gray-700 hover:border-coral'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Age Range: {formData.preferences.ageRange[0]} - {formData.preferences.ageRange[1]}
        </label>
        <div className="px-3">
          <input
            type="range"
            min="18"
            max="50"
            value={formData.preferences.ageRange[1]}
            onChange={(e) => setFormData({
              ...formData,
              preferences: {
                ...formData.preferences,
                ageRange: [formData.preferences.ageRange[0], parseInt(e.target.value)]
              }
            })}
            className="w-full accent-coral"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Maximum Distance: {formData.preferences.distance} km
        </label>
        <div className="px-3">
          <input
            type="range"
            min="5"
            max="100"
            value={formData.preferences.distance}
            onChange={(e) => setFormData({
              ...formData,
              preferences: {
                ...formData.preferences,
                distance: parseInt(e.target.value)
              }
            })}
            className="w-full accent-coral"
          />
        </div>
      </div>
    </div>
  );
};

const CompleteStep: React.FC<any> = () => (
  <div className="text-center py-8">
    <div className="w-24 h-24 bg-gradient-to-r from-coral to-warm-pink rounded-full mx-auto mb-6 flex items-center justify-center">
      <Heart size={40} className="text-white animate-pulse" />
    </div>
    <div className="space-y-4 text-gray-700">
      <p className="text-lg font-semibold">Your profile is ready!</p>
      <p>Start exploring The Mix to discover amazing people and share your own moments.</p>
      <div className="bg-coral/10 p-4 rounded-xl mt-6">
        <p className="text-sm text-coral font-medium">
          💡 Remember: You can only message someone after you've both Sparked each other's content!
        </p>
      </div>
    </div>
  </div>
);