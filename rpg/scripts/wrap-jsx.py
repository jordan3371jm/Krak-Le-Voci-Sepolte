# Avvolge testo JSX e attributi title/placeholder in T(); poi i letterali nel codice TSX.
import re, sys, importlib.util
spec = importlib.util.spec_from_file_location('wl', __file__.replace('wrap-jsx.py', 'wrap-literals.py'))
wl = importlib.util.module_from_spec(spec)
sys.argv_backup = sys.argv; sys.argv = ['x']; spec.loader.exec_module(wl); sys.argv = sys.argv_backup

def esc(t): return t.replace('\\', '\\\\').replace("'", "\\'")

def wrap_text_nodes(s):
    n = 0
    def rep(m):
        nonlocal n
        pre, txt = m.group(1), m.group(2)
        if not re.search(r'[A-Za-zÀ-ÿ]{2,}', txt): return m.group(0)
        if re.search(r'=>|&&|===|\|\||\breturn\b|;\s*$|\bconst\b', txt): return m.group(0)
        lead = re.match(r'^\s*', txt).group(0); trail = re.search(r'\s*$', txt).group(0)
        core = txt.strip()
        if not core: return m.group(0)
        L = "{' '}" if lead and '\n' not in lead else lead
        R = "{' '}" if trail and '\n' not in trail else trail
        n += 1
        core = core.replace('&nbsp;', ' ')
        return f"{pre}{L}{{T('{esc(core)}')}}{R}"
    s2 = re.sub(r'((?<=[\"}\w/\'])>)([^<>{}]+)(?=[<{])', rep, s)
    s2 = re.sub(r'(\}\s*)(?=)', r'\1', s2)
    return s2, n

def wrap_text_after_brace(s):
    # testo tra } e < (es. {x} punti</span>)
    n = 0
    def rep(m):
        nonlocal n
        txt = m.group(2)
        if not re.search(r'[A-Za-zÀ-ÿ]{2,}', txt) or re.search(r"[=;()\[\]]|'|\"|&&|\?|:\s|\.\w", txt) or re.match(r'\s*(as|satisfies)\s', txt): return m.group(0)
        lead = re.match(r'^\s*', txt).group(0); trail = re.search(r'\s*$', txt).group(0); core = txt.strip()
        L = "{' '}" if lead and '\n' not in lead else lead
        R = "{' '}" if trail and '\n' not in trail else trail
        n += 1
        return f"{m.group(1)}{L}{{T('{esc(core)}')}}{R}"
    return re.sub(r'(\})([^<>{}\n]+)(?=<)', rep, s), n

def wrap_attrs(s):
    n = 0
    def rep(m):
        nonlocal n
        v = m.group(2)
        if not re.search(r'[A-Za-zÀ-ÿ]{2,}', v): return m.group(0)
        n += 1
        return f"{m.group(1)}={{T('{esc(v)}')}}"
    return re.sub(r'\b(title|placeholder|aria-label)="([^"]*)"', rep, s), n

f = sys.argv[1]
s = open(f).read()
s, a = wrap_attrs(s)
s, b = wrap_text_nodes(s)
s, c = wrap_text_after_brace(s)
wl.TRIGGERS[:] = wl.TRIGGERS + [r'set\w+\(\s*', r'\|\|\s*', r'\?\?\s*']
s, d = wl.process(s, 'T')
if "from '../i18n'" not in s:
    s = "import { t as T } from '../i18n';\n" + s
open(f, 'w').write(s)
print(f, a, b, c, d)
