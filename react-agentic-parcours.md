# React Agentic - Parcours du Projet

## Résumé Exécutif

Ce document retrace le parcours de développement d'un framework permettant de créer des commandes et agents Claude Code via une approche TSX-to-Markdown. Le projet répond à un besoin identifié : permettre aux développeurs de créer des flows IA contrôlés tout en conservant la puissance de réflexion des agents.

---

## Contexte Initial

### Opportunités Identifiées

L'évolution rapide de Claude Code (agents, commandes, skills) ouvre un champ d'opportunités significatif, accompagné de nombreux défis et zones d'incertitude.

### Problématique Centrale

**Comment faire suivre à un agent IA un flow prédéfini de A à B, de manière normée et contrôlée, tout en conservant la puissance de réflexion de l'IA ?**

En tant que développeur, le besoin d'un flow contrôlé est essentiel, mais doit coexister avec l'intelligence apportée par l'agent.

---

## Phase 1 : Premières Expérimentations

### Approche

- Utilisation de Claude Code pour créer des agents et commandes
- Méthode de "vibe coding"
- Tests sur des cas simples

### Difficultés Rencontrées

| Difficulté | Impact |
|------------|--------|
| Manque de documentation | Pas de référence pour les bonnes pratiques |
| Écosystème en mutation constante | Instabilité des conventions |
| Absence de best practices établies | Essais-erreurs comme seule méthode |
| Vérification fastidieuse | Processus long et complexe |

### Cas d'Usage Test : Validation de Produits

Objectif : Permettre à Claude Code de vérifier les informations d'un produit (catégorie, marque, modèle, spécifications) à partir d'une URL accessible sur le web (ex: Amazon).

### Résultats

- **Positif** : La résolution du problème via Claude Code est possible
- **Négatif** : L'agent a des difficultés à suivre un flow prédéfini
  - Sortie du flow prévu
  - Créativité excessive (ex: création de scripts Python non demandés)
  - Plus le contexte grandit, moins l'agent suit le flow

### Conclusion Phase 1

La communication avec les agents pour leur expliquer quoi faire est très complexe. Pause du projet en attente de maturation de l'écosystème.

---

## Phase 2 : Découverte d'Outils Existants

### Outils Analysés

#### BMAP
- Flow complet de création d'applications A à Z
- Orienté management de produits (grandes équipes/entreprises)
- **Verdict** : Abandonné - processus trop long pour un contexte startup

#### Get Shit Done (GSD)
- Orienté petites équipes
- Focus sur la livraison rapide
- Processus de phases et recherche intégré
- **Verdict** : Retenu pour analyse approfondie

### Philosophie de Get Shit Done

GSD adresse la problématique du vidage de contexte : plus le contexte Claude Code se remplit, moins l'IA reste performante.

#### Architecture GSD

```
┌─────────────────────────────────────────────────────┐
│                    ORCHESTRATEUR                     │
│              (Commande - contexte minimal)           │
│                                                      │
│    ┌─────────────┐    ┌─────────────┐               │
│    │  State MD   │◄──►│   Gestion   │               │
│    │ (centralisé)│    │   du flow   │               │
│    └─────────────┘    └─────────────┘               │
│           │                                          │
│           ▼                                          │
│    ┌─────────────────────────────────┐              │
│    │         AGENTS                   │              │
│    │    (contexte propre, vide)       │              │
│    │    - Travailleurs spécialisés    │              │
│    │    - Tâches courtes              │              │
│    └─────────────────────────────────┘              │
└─────────────────────────────────────────────────────┘
```

#### Principes Clés

1. **Tâches courtes et spécialisées** - Limiter la charge de contexte
2. **État centralisé en fichiers MD** - Persistance et communication entre commandes
3. **Séparation orchestrateur/exécutants** - La commande orchestre, les agents exécutent
4. **Contexte vide pour les agents** - Chaque agent repart avec un contexte frais

---

## Phase 3 : Analyse Approfondie de GSD

### Objectif

Comprendre la philosophie et extraire des patterns réutilisables.

### Source

Code accessible publiquement sur GitHub - nombreuses commandes et agents disponibles.

### Résultats de l'Analyse

- Identification de patterns récurrents
- Philosophie cohérente malgré des variations
- Manière de faire identique dans :
  - Les commandes
  - Les agents
  - La communication commande/agent

### Mise en Pratique des Patterns

| Méthode | Résultat |
|---------|----------|
| Manuelle | Trop de patterns à gérer simultanément |
| Via Claude Code | Agent perdu, non-respect de tous les patterns |

### Constat

**Une couche d'abstraction est nécessaire** pour :
- Gérer la complexité des patterns
- Éviter la duplication de code
- Anticiper les changements de conventions et modèles
- Regrouper les éléments répétitifs

---

## Phase 4 : Recherche de Solution Technique

### Solution 1 : Typage TypeScript

**Approche** : Typage complet des patterns avec script import/export, variables dynamiques depuis fichiers MD.

**Avantages** :
- Fonctionnel

**Inconvénients** :
- Variables dynamiques difficiles à rendre statiques
- Interaction complexe (nécessite interface web)

**Verdict** : Abandonné

### Solution 2 : Composants React → Markdown

**Approche** : Composants React transformés en Markdown, abstraction derrière les composants.

**Avantages** :
- Élégant
- Permet des abstractions puissantes
- Variables TypeScript (env, etc.)
- Fichiers MD bien organisés
- Reproduction possible des agents/commandes GSD

**Points de friction** :
- Difficultés lors de l'ajout d'abstractions complexes
- Communication commande/agent avec attributs partagés
- Typage sur attributs communs
- Sorties multi-plateformes (OpenCode, Antigravity)

### Découverte : L'Approche React Native

React Native résout un problème similaire :
- Input : TSX avec balises spécifiques
- Output : Code Android ET iOS (différents)

**Architecture React Native** :
```
TSX → AST (couche intermédiaire) → Code iOS / Android
```

Cette approche correspondait exactement aux besoins du projet.

---

## Phase 5 : Version Actuelle (Transpiler TSX → Markdown)

### Objectifs de Design

1. **Balisage HTML basique** - Familiarité développeur (ex: `<h1>` → `#`)
2. **Support Front Matter** - Convention YAML indispensable pour Claude Code
3. **Simplicité maximale** - TSX → Markdown sans complexité inutile

### Fonctionnalités Implémentées

#### Core
- Transpiler TSX vers Markdown
- Watch mode (rechargement automatique)
- Typage des balises
- Limitations de balises contextuelles

#### Composants
- **Command** - Point d'entrée, orchestration
- **Agent** - Travailleurs spécialisés
- **Markdown** - Contenu libre
- **XML Blocks** - Structure pour meta prompting

#### Communication
- Canal typé entre commandes et agents
- Définition des inputs attendus par l'agent
- Contrainte de correspondance côté commande

#### Variables
- Assignation de variables Claude Code
- Utilisation dans conditions de prompt
- Transmission aux agents

---

## Potentiel et Valeur

### Pour les Développeurs

| Avant | Après |
|-------|-------|
| Recherche d'information complexe | Patterns préexistants |
| Application difficile | Typage et validation |
| Processus de réflexion long | Manières de faire prédéfinies |
| Documentation inexistante | Exemples basés sur GSD |

### Pour les Clients

**Constat** : L'IA agentique est actuellement sous-utilisée. Les IA peuvent accompagner ou remplacer des tâches répétitives, y compris dans des domaines métier spécifiques.

**Proposition de Valeur** :

```
┌──────────────────────────────────────────────────────┐
│                    CE QUE LE PROJET FAIT             │
├──────────────────────────────────────────────────────┤
│ • Création facilitée de flows IA                     │
│ • Adaptation à des contextes spécifiques             │
│ • Intelligence ajoutée aux flows                     │
│ • Boîte à outils de patterns éprouvés               │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│               CE QUE LE PROJET NE FAIT PAS           │
├──────────────────────────────────────────────────────┤
│ • Adaptation automatique à n'importe quel client     │
│ • Remplacement de la compréhension métier            │
└──────────────────────────────────────────────────────┘
```

**Étape Nécessaire** : Compréhension du flow client et de ses use cases avant utilisation de la boîte à outils.

### Capitalisation

Le projet capitalise sur :
- Un flow générique fonctionnel (Get Shit Done)
- Des patterns testés et validés
- Une boîte à outils adaptable à des demandes clients variées

---

## Gains Attendus

### Temporalité des Bénéfices

| Horizon | Constat |
|---------|---------|
| **Court terme** | Écrire des fichiers MD à la main serait plus rapide |
| **Moyen/Long terme** | Gains significatifs sur la maintenabilité et l'évolutivité |

### Sources de Gain

- **Maintenabilité** : Sans couche d'abstraction, le code doit être dupliqué et modifié à plusieurs endroits à chaque changement
- **Capitalisation** : La connaissance des patterns est difficile à conserver et vérifier sans framework
- **Cohérence** : L'abstraction permet de lier les éléments entre eux de manière structurée
- **Fiabilité** : Typage et vérifications automatiques réduisent les erreurs

---

## Comparaison Avant/Après

### Objectif de Parité

Le fichier MD de sortie du transpiler doit être **identique** au résultat qu'on aurait écrit manuellement. Le framework n'altère pas le résultat final.

### Axes de Comparaison

| Critère | Sans Framework | Avec Framework |
|---------|----------------|----------------|
| Patterns | À mémoriser et appliquer manuellement | Encapsulés dans les composants |
| Typage | Aucun | Validation à la compilation |
| Erreurs | Détectées à l'exécution (par l'agent) | Détectées au build |
| Cohérence | Dépend de la rigueur du développeur | Garantie par l'abstraction |

---

## État Actuel et Limitations

### Ce Qui Fonctionne

Le framework permet déjà de générer des fichiers MD complets et fonctionnels pour Claude Code.

### Ce Qui Reste à Faire

- Ajout de features supplémentaires
- Simplification de la création de flows complets
- Validation continue des best practices

### Limitations Identifiées

Actuellement, pas de limitation bloquante. Le framework produit du MD valide et utilisable.

---

## Stack Technique

### Dépendances Principales

| Technologie | Rôle |
|-------------|------|
| **ts-morph** | Transformation TypeScript → AST |
| **Node.js** | Runtime (versions récentes requises) |
| **TypeScript** | Langage source et typage |

### Architecture de Transformation

```
TSX (source) → AST (intermédiaire) → Markdown (sortie)
```

**Note** : Le projet utilise AST (Abstract Syntax Tree), pas DSL (Domain Specific Language).

### Compatibilité

- Versions Node.js récentes requises
- Non compatible avec les anciennes versions
- Dépendances volontairement minimales

---

## Roadmap et Vision

### Court Terme : Validation Terrain

**Priorité** : Tester le framework sur un cas client réel.

- Clients potentiels identifiés
- Objectif : confronter le framework à un besoin métier concret
- Résultat attendu : identification des manques ou validation du gain de temps

### Moyen Terme : Enrichissement Fonctionnel

| Domaine | État | Description |
|---------|------|-------------|
| Commands | ✅ Implémenté | Création de commandes Claude Code |
| Agents | ✅ Implémenté | Création d'agents spécialisés |
| Communication | ✅ Implémenté | Canal typé commande ↔ agent |
| Variables | ✅ Implémenté | Assignation et utilisation |
| Skills | ⏳ À explorer | Non encore abordé |
| State Providers | ⏳ À explorer | Gestion d'état flexible |

### Long Terme : State Providers

**Vision** : Permettre une flexibilité sur la persistance de l'état.

```
┌─────────────────────────────────────────────────────┐
│                 STATE PROVIDER                       │
│         (configurable via framework)                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌─────────────┐    ┌─────────────┐               │
│   │  Local MD   │    │  Database   │               │
│   │  (défaut)   │    │  (config)   │               │
│   └─────────────┘    └─────────────┘               │
│                                                      │
│   Configuration via variables d'environnement       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

Cette fonctionnalité serait complexe à implémenter sans framework, mais devient accessible grâce à la couche d'abstraction.

---

## Synthèse

Ce projet répond à un besoin réel identifié à travers un parcours d'expérimentation et d'analyse. La solution actuelle (transpiler TSX → Markdown) offre l'abstraction nécessaire pour créer des flows IA contrôlés, tout en restant accessible aux développeurs familiers avec l'écosystème React/TypeScript.

L'écosystème IA évolue rapidement, mais les fondations posées permettent d'accompagner cette évolution tout en fournissant dès maintenant une valeur concrète pour la création de solutions IA adaptées à des contextes métier spécifiques.
