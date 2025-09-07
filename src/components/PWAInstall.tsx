import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstall: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      // Check if running in standalone mode
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsStandalone(standalone);
      
      // Check if running in PWA mode
      const isPWA = window.navigator.standalone || standalone;
      setIsInstalled(isPWA);
    };

    // Check if device is iOS
    const checkIOS = () => {
      const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setIsIOS(iOS);
    };

    checkInstalled();
    checkIOS();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      
      // Track installation
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.active?.postMessage({
            type: 'APP_INSTALLED',
            timestamp: Date.now()
          });
        });
      }
    };

    // Listen for display mode changes
    const handleDisplayModeChange = () => {
      checkInstalled();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Store dismissal in localStorage to avoid showing again immediately
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or if user recently dismissed
  if (isInstalled || isStandalone) {
    return null;
  }

  // Check if user recently dismissed (within 24 hours)
  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  if (dismissedTime) {
    const timeSinceDismissed = Date.now() - parseInt(dismissedTime);
    if (timeSinceDismissed < 24 * 60 * 60 * 1000) { // 24 hours
      return null;
    }
  }

  // iOS-specific install instructions
  if (isIOS && !isInstalled) {
    return (
      <div className="pwa-install-banner ios">
        <div className="pwa-install-content">
          <div className="pwa-install-icon">
            📱
          </div>
          <div className="pwa-install-text">
            <h3>Install Spark</h3>
            <p>Add Spark to your home screen for quick access and a better experience!</p>
            <div className="pwa-install-steps">
              <div className="pwa-install-step">
                <span className="step-number">1</span>
                <span>Tap the Share button</span>
              </div>
              <div className="pwa-install-step">
                <span className="step-number">2</span>
                <span>Scroll down and tap "Add to Home Screen"</span>
              </div>
            </div>
          </div>
          <button 
            className="pwa-install-close"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // Android/Chrome install prompt
  if (showInstallPrompt && deferredPrompt) {
    return (
      <div className="pwa-install-banner">
        <div className="pwa-install-content">
          <div className="pwa-install-icon">
            📱
          </div>
          <div className="pwa-install-text">
            <h3>Install Spark</h3>
            <p>Get quick access to Spark with our app! Install now for a better experience.</p>
          </div>
          <div className="pwa-install-actions">
            <button 
              className="pwa-install-btn pwa-install-btn-primary"
              onClick={handleInstallClick}
            >
              Install
            </button>
            <button 
              className="pwa-install-btn pwa-install-btn-secondary"
              onClick={handleDismiss}
            >
              Not now
            </button>
          </div>
          <button 
            className="pwa-install-close"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PWAInstall;
