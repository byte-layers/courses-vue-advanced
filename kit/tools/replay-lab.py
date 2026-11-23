#!/usr/bin/env python3
"""Rejoue le lab comme un apprenant, dans un HOME temporaire.

Pour chaque étape N : l'application part de l'état de fin de l'étape N-1 ; les blocs `exec` sont joués dans l'ordre
du texte (un label finissant par « (laisser tourner) » lance la commande en arrière-plan) ; puis chaque `verify` d'une
section qui porte un `solution` doit ÉCHOUER (l'état vide est refusé) ; on applique alors le rattrapage de l'étape N
(`catch-up.sh N`, qui équivaut à la solution) et tous les `verify` de l'étape doivent réussir.
Usage : python3 kit/tools/replay-lab.py [--steps 01,02] [--keep]
"""
import os, re, sys, glob, shutil, subprocess, tempfile, time, signal

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LAB = os.path.join(REPO, "vue-shop-day", ".layers")
FENCE = re.compile(r"^(`{3,4})(exec|verify|solution|setup|hint)\n(.*?)^\1\s*$", re.S | re.M)
args = sys.argv[1:]
only = None
if "--steps" in args:
    only = args[args.index("--steps") + 1].split(",")
keep = "--keep" in args

home = tempfile.mkdtemp(prefix="vue-replay-")
env = dict(os.environ, HOME=home, VUE_SHOP_DIR=os.path.join(home, "byte-layers/vue/shop"), CI="1")
os.makedirs(os.path.join(home, "byte-layers/vue"))
shutil.copytree(REPO, os.path.join(home, "byte-layers/vue/course"), ignore=shutil.ignore_patterns(".git", "node_modules"))
shop = env["VUE_SHOP_DIR"]
background = []
fails = 0

def sh(cmd, timeout=600):
    p = subprocess.run(["bash", "-c", cmd], capture_output=True, text=True, env=env, timeout=timeout)
    return p.returncode, (p.stdout + p.stderr).strip()

def body_of(raw):
    return raw.split("\n---\n", 1)[-1] if raw.startswith("label:") else raw

def label_of(raw):
    m = re.match(r'label:\s*"?(.*?)"?\s*\n---\n', raw)
    return m.group(1) if m else ""

def catch_up(n):
    rc, out = sh(f"sh {home}/byte-layers/vue/course/kit/catch-up.sh {n}")
    print(f"   rattrapage {n} rc={rc}")
    if rc: print(out[-800:])
    return rc

steps = sorted(f for f in glob.glob(os.path.join(LAB, "[0-9][0-9]-*.md")))
try:
    for f in steps:
        n = os.path.basename(f)[:2]
        if only and n not in only: continue
        text = open(f, encoding="utf-8").read()
        print("==", os.path.basename(f))
        prev = f"{int(n) - 1:02d}"
        if n != "01":
            if catch_up(prev): fails += 1; continue
        sections = re.split(r"^## ", text, flags=re.M)
        verifies = []  # (section_has_solution, body)
        for sec in sections:
            blocks = [(m[2], m[3]) for m in FENCE.finditer(sec)]
            has_sol = any(k == "solution" for k, _ in blocks)
            for kind, raw in blocks:
                if kind in ("exec", "setup"):
                    if label_of(raw).endswith("(laisser tourner)"):
                        p = subprocess.Popen(["bash", "-c", body_of(raw)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
                        background.append(p); time.sleep(4)
                        print(f"   exec (arrière-plan) :: {body_of(raw).strip().splitlines()[0][:80]}")
                    else:
                        rc, out = sh(body_of(raw))
                        print(f"   {kind} rc={rc} :: {body_of(raw).strip().splitlines()[0][:80]}")
                        if rc: fails += 1; print("      ->", out[-400:])
                elif kind == "verify":
                    verifies.append((has_sol, raw))
        # 1) l'état vide est refusé
        for has_sol, raw in verifies:
            if has_sol:
                rc, out = sh(body_of(raw))
                ok = rc != 0
                fails += not ok
                print(f"   verify AVANT solution, doit échouer : {'ok' if ok else 'PROBLÈME (il réussit à vide)'}")
        # 2) rattrapage = solution, tout doit passer
        if any(h for h, _ in verifies):
            if catch_up(n): fails += 1; continue
        for has_sol, raw in verifies:
            rc, out = sh(body_of(raw))
            fails += rc != 0
            print(f"   verify rc={rc} :: {(out.splitlines() or [''])[0][:110]}")
finally:
    for p in background:
        try: os.killpg(p.pid, signal.SIGTERM)
        except Exception: pass
    if not keep: shutil.rmtree(home, ignore_errors=True)
    else: print("HOME conservé :", home)
print("échecs :", fails)
sys.exit(1 if fails else 0)
