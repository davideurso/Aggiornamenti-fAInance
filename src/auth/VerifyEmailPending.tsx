import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { User } from 'firebase/auth';
import { fbAuth } from '../firebase/client';
import { signOutAccount, sendAccountEmailVerification } from './authService';
import { watchEmailVerification } from './watchEmailVerification';
import { verificationText } from './verificationCopy';
import logo from '../../assets/verification-brand.png';
import './emailAction.css';
import './verifyEmailPending.css';

const pendingSends = new Map<string, Promise<void>>();
function sendOnce(user: User) {
  try { if (sessionStorage.getItem('fainance_verification_sent_' + user.uid) === '1') return Promise.resolve(); } catch {}
  if (!pendingSends.has(user.uid)) {
    const request = sendAccountEmailVerification(user, fbAuth.languageCode || 'it').finally(() => pendingSends.delete(user.uid));
    pendingSends.set(user.uid, request);
  }
  return pendingSends.get(user.uid)!;
}

export function VerifyEmailPending({user, onVerified}: {user: User; onVerified: () => void}) {
  const language = fbAuth.languageCode || (typeof navigator !== 'undefined' ? navigator.language : 'it');
  const L = (text: string) => verificationText(text, language);
  const [delivery, setDelivery] = useState<'sending' | 'sent' | 'failed'>('sending');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setDelivery('sending');
    void sendOnce(user).then(() => { if (active) setDelivery('sent'); }, () => { if (active) setDelivery('failed'); });
    return () => { active = false; };
  }, [user.uid, retry]);
  useEffect(() => watchEmailVerification(fbAuth, user, onVerified, Capacitor.isNativePlatform() ? App : undefined), [user, onVerified]);
  return <main className="fainance-email-action fainance-verification-pending">
    <div className="verification-card">
      <div className="verification-brand"><img src={logo} alt="fAInance"/></div>
      <section className="verification-content">
        <div className="verification-envelope" aria-hidden="true">
          <svg viewBox="0 0 48 40" fill="none"><rect x="3" y="5" width="42" height="30" rx="4" stroke="currentColor" strokeWidth="2.5"/><path d="m5 8 19 14L43 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>✓</span>
        </div>
        <h1>{L('Account creato.')}</h1>
        <div className="verification-title-accent" aria-hidden="true"/>
        <h2>{L('Verifica la tua email')}<br/>{L('per completare l’accesso.')}</h2>
        <p className="verification-instructions" role={delivery === 'failed' ? 'alert' : 'status'}>{delivery === 'sent' ? <>{L('Ti abbiamo inviato un link di conferma.')}<br/>{L('Apri l’email e tocca il link.')}</> : delivery === 'failed' ? L('Email di verifica non inviata. Riprova.') : L('Invio email di verifica in corso…')}</p>
        <p className="verification-recipient">{user.email}</p>
        <p className="verification-return">{L('Al ritorno nell’app, l’accesso si completerà automaticamente.')}</p>
        <div className="verification-actions">
          {delivery === 'failed' && <button className="verification-retry" onClick={() => setRetry(value => value + 1)}>{L('Reinvia email di verifica')}</button>}
          <button className="verification-exit" onClick={() => void signOutAccount()}>{L('Esci')}</button>
        </div>
      </section>
    </div>
  </main>;
}
