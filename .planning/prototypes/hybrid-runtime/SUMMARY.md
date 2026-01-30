# Hybrid Runtime TSX - Sommaire Complet

## Vision

Un framework TSX qui permet de **mélanger code TypeScript déterministe et instructions Claude Code** dans une même commande, avec une séparation claire des responsabilités.

```
┌─────────────────────────────────────────────────────────────┐
│                      command.tsx                            │
│  ┌──────────────┐              ┌──────────────────────────┐ │
│  │ TypeScript   │  ←── runtimeFn ───→  │ Markdown/Claude │ │
│  │ (déterministe)│              │ (AI reasoning)         │ │
│  └──────────────┘              └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓ compile
┌─────────────────────┐  ┌─────────────────────────────────────┐
│   runtime.js        │  │           COMMAND.md                │
│   (Node.js)         │  │           (Claude Code)             │
└─────────────────────┘  └─────────────────────────────────────┘
```

---

## Choix Architecturaux Clés

### 1. Suppression de `<Markdown>` → Texte Brut

**Avant:**
```tsx
<Markdown>
  ## Planning Phase {ctx.phaseId}

  Directory: `{ctx.phaseDir}`
</Markdown>
```

**Après:**
```tsx
## Planning Phase {ctx.phaseId}

Directory: `{ctx.phaseDir}`
```

**Rationale:**
- Réduit le boilerplate
- Le contenu d'une `<Command>` est naturellement du markdown
- Plus proche de l'écriture markdown native
- Les composants (`<If>`, `<SpawnAgent>`) se distinguent naturellement du texte

---

### 2. `runtimeFn()` - Pont Typé vers le Runtime

**Concept:** Transformer une fonction TypeScript en composant TSX typé.

```tsx
// Définition dans le runtime
async function init(args: { arguments: string }): Promise<PlanPhaseContext> {
  // ... logique déterministe
}

// Création du composant typé
const Init = runtimeFn(init);

// Usage avec type checking complet
<Init.Call args={{ arguments: "$ARGUMENTS" }} output={ctx} />
```

**Avantages:**
| Aspect | Bénéfice |
|--------|----------|
| Refactoring | Renommer `init` → propage partout |
| Args validation | TypeScript vérifie les clés et types |
| Output validation | `ScriptVar<T>` doit matcher le return type |
| Autocompletion | IDE suggère les props valides |

---

### 3. Branded Types pour `ScriptVar<T>`

**Problème:** TypeScript utilise le structural typing par défaut.

```typescript
// Sans branding: ces types sont interchangeables!
type A = { __varName: string };
type B = { __varName: string };
```

**Solution:** Branded types (nominal typing).

```typescript
declare const __scriptVarBrand: unique symbol;

interface ScriptVar<T> {
  readonly [__scriptVarBrand]: T;  // Le type T devient le "brand"
  readonly __varName: string;
  readonly __path: readonly string[];
}
```

**Résultat:**
```typescript
ScriptVar<string> ≠ ScriptVar<PlanPhaseContext>  // ✅ Types distincts
```

---

### 4. Séparation TS/Markdown au Compile Time

**Entrée:** Un fichier `.tsx`

**Sortie:** Deux fichiers
- `runtime.js` - Code Node.js exécutable
- `COMMAND.md` - Markdown pour Claude Code

```
command.tsx ──────┬────────────→ COMMAND.md
                  │
                  └────────────→ runtime.js
```

**Le markdown généré appelle le runtime via:**
```bash
CTX=$(node .claude/runtime/plan-phase.js init '{"arguments":"'"$ARGUMENTS"'"}')
```

---

### 5. Accès aux Propriétés via jq

**TSX:**
```tsx
{ctx.phaseId}
{ctx.flags.gaps}
```

**Markdown compilé:**
```markdown
$(echo "$CTX" | jq -r '.phaseId')
$(echo "$CTX" | jq -r '.flags.gaps')
```

**Conditions:**
```tsx
<If condition={ctx.hasPlans}>
```

**Compile vers:**
```markdown
<If test="$(echo "$CTX" | jq -r '.hasPlans') = true">
```

---

## Composants Disponibles

### Composants de Structure

| Composant | Description | Exemple |
|-----------|-------------|---------|
| `<Command>` | Racine d'une commande | `<Command name="gsd:plan">` |
| `<XmlBlock>` | Section XML structurée | `<XmlBlock name="context">` |

### Composants de Contrôle

| Composant | Description | Exemple |
|-----------|-------------|---------|
| `<If>` | Condition | `<If condition={ctx.error}>` |
| `<Else>` | Branche alternative | `<If>...<Else>...</Else></If>` |
| `<Loop>` | Boucle avec compteur | `<Loop max={3} counter={i}>` |
| `<Break>` | Sortie de boucle | `<Break />` |
| `<Return>` | Sortie anticipée | `<Return />` |

### Composants d'Interaction

| Composant | Description | Exemple |
|-----------|-------------|---------|
| `<SpawnAgent>` | Lance un agent | `<SpawnAgent type="gsd-planner">` |
| `<AskUser>` | Question utilisateur | `<AskUser question="..." options={[...]}>` |

### Composants Runtime

| Composant | Description | Exemple |
|-----------|-------------|---------|
| `runtimeFn()` | Crée composant depuis fonction | `const Init = runtimeFn(init)` |
| `<X.Call>` | Appelle une fonction runtime | `<Init.Call args={...} output={...}>` |
| `useScriptVar<T>()` | Déclare une variable typée | `const ctx = useScriptVar<Context>('ctx')` |

---

## Hooks

### `useScriptVar<T>(name: string)`

Déclare une variable qui contiendra le résultat d'un script.

```tsx
const ctx = useScriptVar<PlanPhaseContext>('ctx');

// ctx est un proxy typé
ctx.phaseId      // ScriptVar<string>
ctx.flags        // ScriptVarProxy<Flags>
ctx.flags.gaps   // ScriptVar<boolean>
```

**Comportement:**
- **Compile-time:** Proxy TypeScript pour type checking
- **Emit-time:** Génère les expressions jq appropriées
- **Runtime:** Variable shell contenant du JSON

---

## Type Safety

### Erreurs Détectées

| Erreur | Code | Message TypeScript |
|--------|------|-------------------|
| Mauvaise clé args | `args={{ wrong: "x" }}` | `'wrong' does not exist in type` |
| Mauvais type args | `args={{ arguments: 123 }}` | `Type 'number' not assignable to 'string'` |
| Args manquant | `args={{ }}` | `Property 'x' is missing` |
| Mauvais type output | `output={stringVar}` | `ScriptVar<string> not assignable to ScriptVar<Context>` |
| Output manquant | `<Init.Call args={...} />` | `Property 'output' is missing` |
| Output sur void | `<Archive.Call output={x} />` | `'output' does not exist in type` |

### Configuration Requise

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react-agentic"
  }
}
```

---

## Flow de Données

```
┌─────────────────────────────────────────────────────────────────┐
│                         RUNTIME (Node.js)                       │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐      │
│  │  init   │    │ getCtx  │    │ verify  │    │ summary │      │
│  └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘      │
└───────┼──────────────┼──────────────┼──────────────┼────────────┘
        │ JSON         │ JSON         │ JSON         │ JSON
        ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDE CODE (Markdown)                     │
│                                                                 │
│  $CTX ────────► <If> ────────► <SpawnAgent> ────────► Output   │
│                  │                   │                          │
│                  │              ┌────┴────┐                     │
│                  │              │ AI Work │                     │
│                  │              └─────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Exemple Complet Minimal

```tsx
import { Command, useScriptVar, runtimeFn, If, SpawnAgent } from 'react-agentic';
import { init, type Context } from './runtime';

const Init = runtimeFn(init);

export default (
  <Command name="my-command" description="Example command">
    {() => {
      const ctx = useScriptVar<Context>('ctx');

      return (
        <>
          <Init.Call args={{ arguments: "$ARGUMENTS" }} output={ctx} />

          <If condition={ctx.error}>
            ## Error: {ctx.error}
          </If>

          <If condition={!ctx.error}>
            ## Processing {ctx.name}

            <SpawnAgent
              type="worker"
              input={{ task: ctx.task }}
            />
          </If>
        </>
      );
    }}
  </Command>
);
```

---

## Fichiers du Prototype

```
.planning/prototypes/hybrid-runtime/
├── SUMMARY.md                 # Ce fichier
├── ANALYSIS.md                # Analyse architecturale v1
│
├── v1/                        # Version initiale
│   ├── plan-phase.tsx         # Avec <Markdown> et <Script>
│   └── plan-phase.runtime.ts  # Runtime functions
│
├── v2/                        # Améliorations DX
│   ├── IMPROVEMENTS.md        # Changelog v1→v2
│   ├── plan-phase.tsx         # Sans <Markdown>, avec runtimeFn
│   └── runtime-fn.ts          # Implémentation runtimeFn
│
└── v3/                        # Type safety complète
    ├── TYPE-SAFETY.md         # Documentation des erreurs TS
    ├── plan-phase.tsx         # Avec branded types
    └── runtime-fn.ts          # ScriptVar avec branding
```

---

## Évolutions Futures Possibles

| Feature | Description | Priorité |
|---------|-------------|----------|
| Error handling | `<Try>/<Catch>` pour erreurs runtime | Haute |
| Async scripts | Gestion des promises longues | Moyenne |
| State persistence | Variables persistantes entre calls | Moyenne |
| Hot reload | Watch mode avec rebuild automatique | Basse |
| Source maps | Debug TSX → Markdown | Basse |

---

## Dépendances

| Dépendance | Raison | Alternative |
|------------|--------|-------------|
| Node.js | Exécution du runtime | - |
| jq | Parsing JSON dans shell | Node inline |
| TypeScript | Type checking | - |

---

## Résumé des Décisions Clés

1. **Texte brut au lieu de `<Markdown>`** → DX simplifiée, moins de boilerplate
2. **`runtimeFn()` au lieu de `<Script fn="...">`** → Type safety, refactoring safe
3. **Branded `ScriptVar<T>`** → Nominal typing, erreurs à la compilation
4. **Séparation runtime.js / COMMAND.md** → Context AI propre, JS testable
5. **jq pour accès JSON** → Standard Unix, pas de dépendance custom
6. **Component style `<X.Call>`** → Cohérent avec JSX, familiar aux devs React
