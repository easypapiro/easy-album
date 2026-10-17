# EasyAlbum

Album di nozze condiviso: gli sposi creano l'evento e stampano il QR, gli invitati lo inquadrano, scrivono il proprio nome e caricano fino a 20 foto e video in un feed comune. Dall'area sposi si scelgono i ricordi e la musica per il video ricordo (per ora solo interfaccia: la generazione arriverà dopo).

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Firebase (Auth, Firestore, Storage).

## Pagine

| Percorso | Chi | Cosa |
| --- | --- | --- |
| `/` | organizzatori | Landing |
| `/registrati`, `/accedi` | organizzatori | Account personale con email e password |
| `/eventi` | organizzatori | Elenco dei propri eventi, crea nuovo |
| `/eventi/nuovo` | organizzatori | Crea un evento (nomi, data, luogo, copertina) |
| `/eventi/{slug}` | organizzatori | Statistiche, QR, PDF da stampare, link |
| `/eventi/{slug}/seleziona` | organizzatori | Scelta e ordine dei ricordi per il video |
| `/eventi/{slug}/video` | organizzatori | Anteprima, musica, transizione (UI) |
| `/{slug}` | invitati | Benvenuto: inserimento nome (accesso anonimo) |
| `/{slug}/feed` | invitati | Feed condiviso in tempo reale, like, download |
| `/{slug}/carica` | invitati | Caricamento foto/video (max 20 a testa) |

Tono dei testi: le pagine dell'account (accesso, registrazione, elenco eventi) parlano alla singola persona (*tu*); quelle di un evento di matrimonio parlano agli sposi (*voi*).

## Dati

```
events/{slug}                 evento (ownerId, nomi, data, luogo, copertina)
events/{slug}/guests/{uid}    invitato (nome, uploadCount)
events/{slug}/media/{id}      foto/video (url, thumbUrl, autore, didascalia, like)
events/{slug}/video/draft     bozza del video ricordo (solo proprietario)

Storage:
events/{slug}/media/{uid}/…   originali + miniature JPEG
events/{slug}/cover/…         copertina
events/{slug}/music/…         brani caricati dal proprietario
```

Il limite di 20 ricordi è garantito dalle regole di sicurezza (`firestore.rules`): ogni nuovo media va scritto insieme all'incremento del contatore dell'invitato.

L'organizzatore dell'evento entra nell'album automaticamente (salta la schermata del nome), pubblica con il nome del proprio account e senza limite, e non ha un documento in `guests`: non compare tra gli invitati.

---

## Configurazione di Firebase

### 1. Crea il progetto

1. Vai su <https://console.firebase.google.com> → **Aggiungi progetto** (es. `easy-album`). Google Analytics non serve.
2. **Storage richiede il piano Blaze** (a consumo, con una soglia gratuita generosa) per i progetti nuovi: *Impostazioni → Utilizzo e fatturazione → Modifica piano*. Consiglio di impostare subito un avviso di budget su Google Cloud.

### 2. Registra l'app web

1. Nella pagina del progetto: icona **`</>`** (Web) → nome `easy-album-web` → **Registra app** (Hosting non serve).
2. Copia i valori di `firebaseConfig` in un file `.env.local` partendo dal modello:

   ```bash
   cp .env.example .env.local
   ```

   | Variabile | Valore in `firebaseConfig` |
   | --- | --- |
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |

   Queste chiavi sono pubbliche per design: la protezione dei dati è affidata alle regole di sicurezza.

### 3. Authentication

*Build → Authentication → Inizia*, poi nella scheda **Metodo di accesso** abilita:

- **Email/password** — per gli organizzatori.
- **Anonimo** — per gli invitati (entrano solo con il nome).

In *Impostazioni → Domini autorizzati* aggiungi il dominio di produzione (es. `album.easyregalo.com`). `localhost` c'è già.

Facoltativo: in *Modelli* traduci in italiano l'email di reimpostazione password.

### 4. Firestore

*Build → Firestore Database → Crea database* → modalità **produzione** → località `eur3 (europe-west)` o `europe-west8 (Milano)`. La località non si può cambiare in seguito.

### 5. Storage

*Build → Storage → Inizia* → modalità **produzione**, stessa regione di Firestore.

### 6. Pubblica le regole di sicurezza

Le regole sono nel repository (`firestore.rules`, `storage.rules`). Con la Firebase CLI:

```bash
firebase login
```

```bash
firebase use --add
```

(scegli il progetto e dagli l'alias `default`)

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Le regole di Storage leggono Firestore per riconoscere il proprietario dell'evento: al primo deploy la CLI chiede di concedere questo permesso, rispondi **sì**.

### 7. CORS per il download dei file

Il pulsante "Scarica" scarica il file via `fetch`, che richiede il CORS sul bucket. Modifica le origini in `cors.json` (lascia `http://localhost:3000` e aggiungi il tuo dominio), poi:

```bash
gcloud storage buckets update gs://NOME-BUCKET --cors-file=cors.json
```

(`NOME-BUCKET` è il valore di `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. Serve la [gcloud CLI](https://cloud.google.com/sdk/docs/install); in alternativa `gsutil cors set cors.json gs://NOME-BUCKET`.)

### 8. Avvia

```bash
npm run dev
```

Apri <http://localhost:3000>, registrati, crea l'evento e apri il link dell'album da un'altra finestra in navigazione privata per provarlo come invitato.

Per far puntare il QR al dominio di produzione anche quando lavori in locale, imposta `NEXT_PUBLIC_APP_URL`.

---

## Note

- Firebase JS SDK 13 dichiara Node ≥ 24.12. L'SDK gira solo nel browser, quindi Node 22 funziona per sviluppo e build, ma per il deploy conviene Node 24.
- Le miniature (900 px) vengono generate nel browser prima del caricamento: feed e griglie non scaricano gli originali.
- Generazione del video: solo interfaccia. Le scelte (ordine dei media, brano, transizione) sono salvate in `events/{slug}/video/draft`, pronte per il servizio che produrrà il video.
