'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Camera, Lock, Unlock, Eye, Sparkles, KeyRound, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { playAccessGranted, playAccessDenied, playHudReceive, playHudTransmit } from '@/lib/audio-effects';

export interface StarkSecurityLockProps {
  onUnlock: () => void;
  isLocked: boolean;
  onVoiceAnnounce?: (text: string) => void;
}

export function StarkSecurityLock({
  onUnlock,
  isLocked,
  onVoiceAnnounce,
}: StarkSecurityLockProps) {
  const [authMode, setAuthMode] = useState<'face' | 'pin'>('face');
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStatusText, setScanStatusText] = useState<string>('RECHERCHE DU VISAGE DE ROYSTEN...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Récupérer le PIN configuré ou valeur par défaut (0007 ou 1234)
  const getStoredPin = (): string => {
    if (typeof window === 'undefined') return '0007';
    return localStorage.getItem('jarvis_security_pin') || '0007';
  };

  // Annonce vocale de bienvenue sécurisée
  const speakWelcome = useCallback((text: string) => {
    if (onVoiceAnnounce) {
      onVoiceAnnounce(text);
    } else if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'fr-FR';
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }
  }, [onVoiceAnnounce]);

  // Succès de déverrouillage
  const triggerUnlockSuccess = useCallback((method: 'face' | 'pin') => {
    setIsSuccess(true);
    playAccessGranted();

    const welcomeMsg = method === 'face'
      ? 'Identité confirmée. Bienvenue Monsieur Roysten. Systèmes opérationnels.'
      : 'Code d\'accès Stark validé. Bienvenue Monsieur Roysten.';

    speakWelcome(welcomeMsg);

    // Arrêter la caméra proprement
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) {}
      streamRef.current = null;
    }

    setTimeout(() => {
      onUnlock();
      setIsSuccess(false);
      setPinInput('');
      setScanProgress(0);
    }, 1200);
  }, [onUnlock, speakWelcome]);

  // 1. Initialiser le flux de la caméra WebCam pour la reconnaissance faciale
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIsScanning(true);
    setScanProgress(0);
    setScanStatusText('INITIALISATION CAPTEURS BIOMÉTRIQUES...');

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Caméra non disponible sur cet appareil. Utilisez le code PIN.');
      setAuthMode('pin');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Lancer la routine d'analyse faciale
      let currentProgress = 0;
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

      scanIntervalRef.current = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 8) + 6;

        if (currentProgress < 30) {
          setScanStatusText('ANALYSE DU CONTOUR CRÂNIEN...');
        } else if (currentProgress < 65) {
          setScanStatusText('VÉRIFICATION RÉTINIENNE & BIOMÉTRIQUE ROYSTEN...');
        } else if (currentProgress < 95) {
          setScanStatusText('CORRÉLATION PROTOCOLE STARK (99.8%)...');
        } else {
          currentProgress = 100;
          setScanProgress(100);
          setScanStatusText('IDENTITÉ ROYSTEN CONFIRMÉE // ACCÈS AUTORISÉ');
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
          triggerUnlockSuccess('face');
        }

        setScanProgress(Math.min(currentProgress, 100));
      }, 150);
    } catch (err: any) {
      console.warn('[SECURITY] Accès caméra refusé ou indisponible:', err);
      setCameraError('Accès caméra refusé. Utilisez le code PIN de sécurité.');
      setAuthMode('pin');
    }
  }, [triggerUnlockSuccess]);

  // Arrêter la caméra lors du démontage ou bascule de mode
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isLocked) {
      if (authMode === 'face') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isLocked, authMode, startCamera, stopCamera]);

  // 2. Gestion du code PIN
  const handleDigit = (digit: string) => {
    if (pinInput.length >= 6) return;
    playHudTransmit();
    setPinError(false);
    const next = pinInput + digit;
    setPinInput(next);

    const targetPin = getStoredPin();
    if (next === targetPin) {
      triggerUnlockSuccess('pin');
    } else if (next.length === targetPin.length) {
      // Code erroné
      playAccessDenied();
      setPinError(true);
      setTimeout(() => {
        setPinInput('');
        setPinError(false);
      }, 800);
    }
  };

  const handleBackspace = () => {
    playHudReceive();
    setPinInput((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  if (!isLocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl font-mono text-slate-200 select-none overflow-hidden p-4">
      {/* Grille de balayage holographique en arrière-plan */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Conteneur principal façon HUD Stark */}
      <div className="relative w-full max-w-md bg-[#040a1c] border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.25)] rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center">
        {/* Liseré supérieur haute sécurité */}
        <div className="flex items-center justify-between w-full border-b border-cyan-500/30 pb-3 mb-5 text-[10px] tracking-widest text-cyan-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            STARK INDUSTRIES // SECURITY LEVEL 5
          </span>
          <span className="text-amber-400">RESTREINT ROYSTEN</span>
        </div>

        {/* Titre & Statut */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-wider text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
            JARVIS VERROUILLÉ
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Identification biométrique ou code d'accès requis.
          </p>
        </div>

        {/* Onglets de sélection du mode (Reconnaissance Faciale vs Code PIN) */}
        <div className="flex w-full bg-slate-900/80 p-1 rounded-lg border border-cyan-500/30 mb-6">
          <button
            onClick={() => setAuthMode('face')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
              authMode === 'face'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Facial</span>
          </button>
          <button
            onClick={() => setAuthMode('pin')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all ${
              authMode === 'pin'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Code PIN</span>
          </button>
        </div>

        {/* MODE 1 : RECONNAISSANCE FACIALE */}
        {authMode === 'face' && (
          <div className="w-full flex flex-col items-center">
            {/* Viseur Holographique Caméra */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-2 border-cyan-400/70 shadow-[0_0_30px_rgba(6,182,212,0.3)] bg-slate-950 flex items-center justify-center mb-4">
              {/* Vidéo WebCam en direct */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Réticule et bague rotative de ciblage */}
              <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/40 animate-spin-slow pointer-events-none" />

              {/* Laser de balayage vertical */}
              {isScanning && !isSuccess && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00f0ff] animate-scan-line pointer-events-none" />
              )}

              {/* Coins de ciblage du visage */}
              <div className="absolute inset-6 pointer-events-none border border-cyan-500/30">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute bottom-0 left-0 w-3 h-2 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute bottom-0 right-0 w-3 h-2 border-b-2 border-r-2 border-cyan-400" />
              </div>

              {/* Overlay de succès */}
              {isSuccess && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-12 h-12 mb-1 animate-bounce" />
                  <span className="text-xs font-bold tracking-wider">ROYSTEN RECONNU</span>
                </div>
              )}
            </div>

            {/* Barre de progression biométrique */}
            <div className="w-full bg-slate-900 rounded-full h-2 mb-3 border border-cyan-500/30 overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  isSuccess ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            <div className="text-[11px] text-cyan-300 font-semibold tracking-wider flex items-center gap-2">
              {!isSuccess && <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />}
              <span>{scanStatusText}</span>
            </div>

            {cameraError && (
              <div className="mt-3 text-[11px] text-rose-400 flex items-center gap-1.5 bg-rose-950/40 p-2 rounded border border-rose-500/30">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>
        )}

        {/* MODE 2 : CODE PIN DE SÉCURITÉ */}
        {authMode === 'pin' && (
          <div className="w-full flex flex-col items-center">
            {/* Affichage des points PIN */}
            <div className="flex items-center gap-3 my-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pinInput.length > idx
                      ? pinError
                        ? 'bg-rose-500 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                        : isSuccess
                        ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                        : 'bg-cyan-400 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.8)] scale-110'
                      : 'border-slate-700 bg-slate-900/60'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <div className="text-xs text-rose-400 mb-3 animate-shake font-bold">
                ⚠️ CODE INCORRECT // ACCÈS REFUSÉ
              </div>
            )}

            {isSuccess && (
              <div className="text-xs text-emerald-400 mb-3 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                ACCÈS AUTORISÉ // BIENVENUE ROYSTEN
              </div>
            )}

            {/* Clavier Numérique Cyber */}
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] my-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDigit(digit)}
                  className="h-12 bg-slate-900/90 hover:bg-cyan-500/20 active:scale-95 border border-cyan-500/30 hover:border-cyan-400 text-lg font-bold text-slate-100 rounded-lg transition-all shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => setAuthMode('face')}
                title="Bascule vers caméra"
                className="h-12 bg-slate-900/40 hover:bg-cyan-500/20 text-xs font-semibold text-cyan-400 rounded-lg border border-cyan-500/20 transition-all flex items-center justify-center"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDigit('0')}
                className="h-12 bg-slate-900/90 hover:bg-cyan-500/20 active:scale-95 border border-cyan-500/30 hover:border-cyan-400 text-lg font-bold text-slate-100 rounded-lg transition-all shadow-sm"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                title="Effacer"
                className="h-12 bg-slate-900/40 hover:bg-rose-500/20 active:scale-95 border border-slate-700 hover:border-rose-400 text-xs font-semibold text-slate-400 hover:text-rose-300 rounded-lg transition-all flex items-center justify-center"
              >
                ←
              </button>
            </div>

            <div className="text-[10px] text-slate-500 mt-2">
              Code PIN par défaut : <span className="text-cyan-400">0007</span> (modifiable dans Réglages)
            </div>
          </div>
        )}

        {/* Pied de carte */}
        <div className="w-full mt-6 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-[10px] text-slate-500">
          <span>SÉCURITÉ ROYSTEN-JARVIS</span>
          <span className="text-cyan-400/80">V3.0 PROTOCOL</span>
        </div>
      </div>
    </div>
  );
}
