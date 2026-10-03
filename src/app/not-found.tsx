import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-cyan-400 flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-3xl font-mono font-bold mb-4 glow-cyan">404 // MODULE INTROUVABLE</h2>
      <p className="text-zinc-400 font-mono text-sm max-w-md mb-6">
        La trajectoire demandée n'est pas répertoriée dans les archives système de JARVIS.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-lg border border-cyan-500/50 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-300 font-mono text-xs transition-all"
      >
        RETOUR AU POSTE DE COMMANDE
      </Link>
    </div>
  );
}
