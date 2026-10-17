const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "Esiste già un account con questa email. Prova ad accedere.",
  "auth/invalid-email": "L'indirizzo email non è valido.",
  "auth/weak-password": "La password deve avere almeno 6 caratteri.",
  "auth/invalid-credential": "Email o password non corretti.",
  "auth/wrong-password": "Email o password non corretti.",
  "auth/user-not-found": "Non esiste un account con questa email.",
  "auth/too-many-requests": "Troppi tentativi. Riprova tra qualche minuto.",
  "auth/network-request-failed": "Connessione assente. Controlla la rete e riprova.",
  "auth/operation-not-allowed": "Metodo di accesso non abilitato nella console Firebase.",
  "auth/admin-restricted-operation": "Accesso anonimo non abilitato nella console Firebase.",
  "permission-denied": "Non hai i permessi per questa operazione.",
  "storage/unauthorized": "Non hai i permessi per caricare questo file.",
  "storage/canceled": "Caricamento annullato.",
  "storage/quota-exceeded": "Spazio di archiviazione esaurito.",
  unavailable: "Connessione assente. Controlla la rete e riprova.",
};

export function errorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (e instanceof Error && e.message.startsWith("Firebase non è configurato")) return e.message;
  return "Qualcosa è andato storto. Riprova.";
}
