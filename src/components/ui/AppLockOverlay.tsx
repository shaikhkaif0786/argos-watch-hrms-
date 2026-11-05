import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, Check, X, AlertCircle } from 'lucide-react';
import { useHRMS } from '../../context/HRMSContext';
import { ModalShell } from './EnterpriseComponents';

export const AppLockOverlay: React.FC = () => {
  const {
    isAppLocked,
    unlockApp,
    resetAppLockWithIdentity,
    currentEmployee,
    t,
  } = useHRMS();

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Reset Identity Verification Fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmpId, setResetEmpId] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [resetError, setResetError] = useState('');

  if (!isAppLocked) return null;

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError(false);

    if (nextPin.length === 4) {
      const ok = await unlockApp(nextPin);
      if (!ok) {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      } else {
        setPin('');
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (newPin !== confirmNewPin) {
      setResetError('New passcodes do not match.');
      return;
    }
    if (newPin.length !== 4) {
      setResetError('Passcode must be exactly 4 digits.');
      return;
    }
    const res = await resetAppLockWithIdentity({
      email: resetEmail,
      employeeId: resetEmpId,
      newPin,
    });
    if (!res.success) {
      setResetError(res.error || 'Identity verification failed.');
    } else {
      setShowResetModal(false);
      setResetEmail('');
      setResetEmpId('');
      setNewPin('');
      setConfirmNewPin('');
    }
  };

  const KEYPAD = [
    { num: '1', letters: '' },
    { num: '2', letters: 'ABC' },
    { num: '3', letters: 'DEF' },
    { num: '4', letters: 'GHI' },
    { num: '5', letters: 'JKL' },
    { num: '6', letters: 'MNO' },
    { num: '7', letters: 'PQRS' },
    { num: '8', letters: 'TUV' },
    { num: '9', letters: 'WXYZ' },
    { num: 'clear', letters: 'CLEAR' },
    { num: '0', letters: '+' },
    { num: 'back', letters: 'DELETE' },
  ];

  return (
    <div className="fixed inset-0 z-9999 bg-white/95 dark:bg-[#000000]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xs flex flex-col items-center text-center">
        {/* Apple Lock Icon */}
        <div className="w-14 h-14 rounded-full bg-[#F0F0F2] dark:bg-[#1C1C1E] flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] mb-4 border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-xs">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          {t('settings.appLock.unlock', 'Enter Passcode')}
        </h2>
        <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1">
          {currentEmployee.fullName} · {currentEmployee.designation}
        </p>

        {/* 4-Dot Passcode Indicators */}
        <div
          className={`flex items-center justify-center gap-4 my-8 transition-transform duration-100 ${
            error ? 'translate-x-[-10px] animate-pulse text-red-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((idx) => {
            const filled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  filled
                    ? 'bg-[#1D1D1F] dark:bg-[#F5F5F7] scale-110'
                    : 'border-2 border-[#D1D1D6] dark:border-[#3A3A3C] bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-medium text-red-500 mb-4 animate-in fade-in">
            Incorrect passcode. Please try again.
          </p>
        )}

        {/* Numeric Keypad (Apple iOS Style) */}
        <div className="grid grid-cols-3 gap-4 w-full px-2">
          {KEYPAD.map((key) => {
            if (key.num === 'clear') {
              return (
                <button
                  key={key.num}
                  type="button"
                  onClick={handleClear}
                  className="h-16 rounded-full flex flex-col items-center justify-center text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F0F0F2] dark:hover:bg-[#1C1C1E] transition-colors cursor-pointer active:scale-95"
                >
                  Clear
                </button>
              );
            }
            if (key.num === 'back') {
              return (
                <button
                  key={key.num}
                  type="button"
                  onClick={handleBackspace}
                  className="h-16 rounded-full flex flex-col items-center justify-center text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:bg-[#F0F0F2] dark:hover:bg-[#1C1C1E] transition-colors cursor-pointer active:scale-95"
                >
                  Delete
                </button>
              );
            }
            return (
              <button
                key={key.num}
                type="button"
                onClick={() => handleDigit(key.num)}
                className="h-16 rounded-full bg-[#F0F0F2] dark:bg-[#1C1C1E] hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex flex-col items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <span className="text-2xl font-semibold leading-none">{key.num}</span>
                {key.letters && (
                  <span className="text-[9px] font-medium tracking-widest text-[#86868B] dark:text-[#6E6E73] mt-0.5">
                    {key.letters}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Forgot Passcode / Reset Flow */}
        <button
          type="button"
          onClick={() => {
            setShowResetModal(true);
            setResetError('');
          }}
          className="mt-8 text-xs text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors cursor-pointer"
        >
          {t('settings.appLock.forgot', 'Forgot Passcode? Reset with Identity Verification')}
        </button>
      </div>

      {/* Identity Verification Reset Modal */}
      <ModalShell
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Verify Identity & Reset Passcode"
        subtitle="Confirm your enterprise credentials to securely set a new 4-digit passcode."
      >
        <form onSubmit={handleResetSubmit} className="space-y-4">
          {resetError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
              Official Email Address
            </label>
            <input
              type="email"
              required
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="e.g. yourname@argos.watch"
              className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:border-[#1D1D1F] dark:focus:border-[#F5F5F7]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
              Employee ID
            </label>
            <input
              type="text"
              required
              value={resetEmpId}
              onChange={(e) => setResetEmpId(e.target.value)}
              placeholder="e.g. EMP-1001"
              className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:border-[#1D1D1F] dark:focus:border-[#F5F5F7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                New 4-Digit Passcode
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-center font-mono tracking-widest text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:border-[#1D1D1F] dark:focus:border-[#F5F5F7]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] mb-1">
                Confirm Passcode
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3 py-2 bg-[#F0F0F2] dark:bg-[#202022] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl text-xs text-center font-mono tracking-widest text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:border-[#1D1D1F] dark:focus:border-[#F5F5F7]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5EA] dark:border-[#2C2C2E]">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              className="px-4 py-2 text-xs font-medium text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#000000] dark:bg-white dark:text-[#000000] rounded-xl hover:opacity-90 transition-opacity"
            >
              Verify & Unlock
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
};
