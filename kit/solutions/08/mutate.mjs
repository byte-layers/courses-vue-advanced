#!/usr/bin/env node
// Vérifie que VOS tests (étape 08) valent quelque chose : ils doivent passer, puis ÉCHOUER quand on casse le code.
//
//   node mutate.mjs
//
// 1. refuse l'état vide : pas de `it.todo`, `it.skip`, `.only` ; au moins N tests par fichier ;
// 2. vos tests passent sur le code tel quel ;
// 3. pour chaque « mutation » (une petite altération du code de l'application), au moins un de vos tests doit
//    échouer : sinon la mutation « survit » et vos tests ne protègent pas ce comportement.
// Les fichiers de l'application sont toujours restaurés à la fin (même en cas d'erreur ou de Ctrl+C).
// Code de sortie : 0 si tout est conforme, 1 sinon.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs'

/** Les fichiers de test que VOUS écrivez, et le nombre minimal de tests attendu dans chacun. */
const LEARNER_SPECS = [
  ['src/features/auctions/useBidRules.spec.ts', 6],
  ['src/features/cart/CartPage.spec.ts', 6],
  ['src/router/navigation.spec.ts', 6],
  ['src/features/auctions/auctionFlow.spec.ts', 6],
]

/** Chaque mutation remplace `from` par `to` dans `file` ; `specs` sont les fichiers de test qui doivent la détecter. */
const MUTATIONS = [
  {
    name: 'l’offre minimale n’ajoute plus le pas',
    file: 'src/features/auctions/useBidRules.ts',
    from: 'round2(current.price + BID_STEP)',
    to: 'round2(current.price)',
    specs: ['src/features/auctions/useBidRules.spec.ts'],
  },
  {
    name: 'la corbeille vide tout le panier au lieu de retirer la ligne',
    file: 'src/features/cart/pages/CartPage.vue',
    from: '@click="cart.remove(item.id)"',
    to: '@click="cart.clear()"',
    specs: ['src/features/cart/CartPage.spec.ts'],
  },
  {
    name: 'la garde laisse passer les routes protégées',
    file: 'src/router/guards.ts',
    from: 'to.meta.requiresAuth && !isAuthenticated()',
    to: 'false',
    specs: ['src/router/navigation.spec.ts'],
  },
  {
    name: 'une offre refusée n’est plus annulée (pas de rollback)',
    file: 'src/features/auctions/useBid.ts',
    from: 'patch(payload.productId, (a) => (a.version === previous.version ? previous : a))',
    to: 'patch(payload.productId, (a) => a)',
    specs: ['src/features/auctions/auctionFlow.spec.ts'],
  },
  {
    name: 'après une reconnexion, on ne rejoint plus les enchères',
    file: 'src/features/auctions/useAuctionSocket.ts',
    from: 'for (const productId of joined) emitJoin(productId)',
    to: '// (mutation) pas de resynchronisation',
    specs: ['src/features/auctions/auctionFlow.spec.ts'],
  },
]

const originals = new Map()
function restoreAll() {
  for (const [file, content] of originals) writeFileSync(file, content)
  originals.clear()
}
process.on('exit', restoreAll)
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(130))

/** Lance Vitest sur ces fichiers et rend le résumé lu dans son JSON. */
function vitest(files) {
  const out = '.mutate-result.json'
  const run = spawnSync('npx', ['vitest', 'run', ...files, '--reporter=json', `--outputFile=${out}`], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  let report = null
  try {
    report = JSON.parse(readFileSync(out, 'utf8'))
  } catch {
    // pas de rapport : Vitest n'a pas pu démarrer
  } finally {
    rmSync(out, { force: true })
  }
  return { code: run.status, report, stderr: run.stderr }
}

let problems = 0
const say = (line = '') => console.log(line)
const fail = (line) => {
  problems++
  say(`  ECHEC : ${line}`)
}

// --- 1. l'état vide est refusé ----------------------------------------------------------------
say('1. Vos fichiers de test')
for (const [file] of LEARNER_SPECS) {
  if (!existsSync(file)) {
    fail(`${file} est introuvable`)
    continue
  }
  const source = readFileSync(file, 'utf8')
  if (/\bit\.todo\(|\btest\.todo\(/.test(source)) fail(`${file} contient encore des it.todo : écrivez ces tests`)
  if (/\b(it|test|describe)\.skip\(/.test(source)) fail(`${file} contient un test désactivé (skip)`)
  if (/\b(it|test|describe)\.only\(/.test(source)) fail(`${file} contient .only : les autres tests ne tournent pas`)
}
if (problems) {
  say('\nÉcrivez vos tests (voir les commentaires des fichiers) puis relancez : node mutate.mjs')
  process.exit(1)
}

// --- 2. ils passent sur le code d'origine -----------------------------------------------------
say('2. Vos tests sur le code d’origine')
const base = vitest(LEARNER_SPECS.map(([file]) => file))
if (!base.report) {
  say(base.stderr)
  fail('Vitest n’a pas produit de rapport')
} else {
  for (const [file, min] of LEARNER_SPECS) {
    const result = base.report.testResults.find((r) => r.name.endsWith(file))
    const total = result?.assertionResults.length ?? 0
    const passed = result?.assertionResults.filter((t) => t.status === 'passed').length ?? 0
    say(`   ${file} : ${passed}/${total} réussis (minimum ${min})`)
    if (total < min) fail(`${file} : au moins ${min} tests attendus, ${total} trouvés`)
    else if (passed !== total) fail(`${file} : ${total - passed} test(s) en échec ou ignoré(s)`)
  }
}
if (problems) process.exit(1)

// --- 3. les mutations -------------------------------------------------------------------------
say('3. Mutations : chacune doit faire échouer au moins un de vos tests')
let survivors = 0
for (const m of MUTATIONS) {
  const source = readFileSync(m.file, 'utf8')
  if (!source.includes(m.from)) {
    fail(`mutation inapplicable (« ${m.from} » introuvable dans ${m.file}) : le code fourni a été modifié`)
    continue
  }
  originals.set(m.file, source)
  writeFileSync(m.file, source.replace(m.from, m.to))
  const run = vitest(m.specs)
  restoreAll()
  const failed = run.report?.testResults.flatMap((r) => r.assertionResults).filter((t) => t.status === 'failed') ?? []
  if (!run.report) {
    fail(`mutation « ${m.name} » : Vitest n’a pas répondu`)
  } else if (failed.length > 0) {
    say(`   tuée     : ${m.name}  (${failed.length} test(s) en échec, ex. « ${failed[0].title} »)`)
  } else {
    survivors++
    say(`   SURVIVE  : ${m.name}  -> ajoutez un test dans ${m.specs.join(', ')}`)
  }
}
if (survivors) fail(`${survivors} mutation(s) survivent : vos tests ne détectent pas ces défauts`)

say()
say(problems ? 'MUTATION : ECHEC' : `MUTATION OK : ${MUTATIONS.length} mutations détectées sur ${MUTATIONS.length}`)
process.exit(problems ? 1 : 0)
