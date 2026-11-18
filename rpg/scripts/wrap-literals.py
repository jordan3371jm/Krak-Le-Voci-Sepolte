# Avvolge in T(...) i letterali di testo passati a toast/chronicle/log/fx e assegnati a .text/title/label.
# Uso: python3 scripts/wrap-literals.py file.ts [nomeFunzione]
import re, sys

def parse_literal(s, i):
    q = s[i]
    j = i + 1
    parts = []  # (kind, text)
    buf = ''
    while j < len(s):
        c = s[j]
        if c == '\\':
            buf += s[j:j+2]; j += 2; continue
        if q == '`' and c == '$' and s[j+1] == '{':
            depth = 1; k = j + 2
            while depth:
                if s[k] == '{': depth += 1
                elif s[k] == '}': depth -= 1
                k += 1
            parts.append(('t', buf)); buf = ''
            parts.append(('e', s[j+2:k-1]))
            j = k; continue
        if c == q:
            parts.append(('t', buf))
            return parts, j + 1
        buf += c; j += 1
    raise ValueError('unterminated')

def name_for(expr, used):
    m = re.findall(r'[A-Za-z_][A-Za-z0-9_]*', expr)
    base = m[-1] if m else 'x'
    if base in ('length', 'name', 'toLowerCase', 'join', 'icon') and len(m) > 1:
        base = m[-2] + ('Name' if m[-1] == 'name' else '')
    base = re.sub(r'[^a-zA-Z0-9]', '', base)[:14] or 'x'
    n = base; k = 2
    while n in used and used[n] != expr:
        n = f'{base}{k}'; k += 1
    used[n] = expr
    return n

def convert(lit_parts, q, fn):
    used = {}
    text = ''
    for kind, v in lit_parts:
        if kind == 't': text += v
        else: text += '{' + name_for(v, used) + '}'
    if not re.search(r'[A-Za-zÀ-ÿ]{2,}', text):
        return None
    if q == '`':
        text = text.replace("\\`", '`')
    # rendi la chiave un letterale a singoli apici
    if q == '"':
        text = text.replace("\\\"", '"')
    text_sq = text.replace("\\'", "'").replace("'", "\\'") if q != "'" else text
    args = ', '.join(f'{k}: {v}' for k, v in used.items())
    return f"{fn}('{text_sq}'" + (f', {{ {args} }})' if args else ')')

TRIGGERS = [r'toast\(\s*\w+,\s*', r'chronicle\(\s*\w+,\s*', r'\blog\(\s*\w+,\s*', r'\bfx\(\s*\w+,\s*[^,]+,\s*', r'\.text\s*=\s*', r'\btitle:\s*', r'\blabel:\s*', r'\btext:\s*', r'\bwhy:\s*', r'\blines:\s*\[\s*', r'\.push\(\s*', r'\.unshift\(\s*', r'return\s+', r'\?\s*', r':\s*(?=[\'"`])']

def process(src, fn):
    out = []
    i = 0
    trig = re.compile('|'.join('(?:' + t + ')' for t in TRIGGERS))
    count = 0
    while True:
        m = trig.search(src, i)
        if not m: out.append(src[i:]); break
        j = m.end()
        out.append(src[i:j])
        if j < len(src) and src[j] in '\'"`' and not re.search(r'(className|key|kind|type|id|tab|faction|scene)\s*[=:]\s*\{?\s*$', src[max(0,j-40):j]):
            try:
                parts, end = parse_literal(src, j)
            except Exception:
                i = j; continue
            raw = src[j:end]
            plain = ''.join(v for k, v in parts if k == 't')
            # solo testo umano: almeno una parola e (spazio o lettera maiuscola iniziale con punteggiatura/emoji)
            human = re.search(r'[A-Za-zÀ-ÿ]{2,}', plain) and (' ' in plain.strip() or re.search(r'[^\x00-\x7f]', plain))
            if human:
                conv = convert(parts, src[j], fn)
                if conv:
                    out.append(conv); count += 1; i = end; continue
            out.append(raw); i = end; continue
        i = j
    return ''.join(out), count

if __name__ == '__main__':
    f = sys.argv[1]; fn = sys.argv[2] if len(sys.argv) > 2 else 'T'
    s = open(f).read()
    # non toccare le righe di import
    res, n = process(s, fn)
    open(f, 'w').write(res)
    print(f, n)

def process_all(src, fn):
    """Avvolge ogni letterale di testo umano non già dentro t()/T() (salta commenti e import)."""
    out = []; i = 0; n = 0; L = len(src)
    while i < L:
        c = src[i]
        if src.startswith('//', i):
            j = src.find('\n', i); j = L if j < 0 else j
            out.append(src[i:j]); i = j; continue
        if src.startswith('/*', i):
            j = src.find('*/', i) + 2; out.append(src[i:j]); i = j; continue
        if src.startswith('import ', i) and (i == 0 or src[i-1] == '\n'):
            j = src.find('\n', i); out.append(src[i:j]); i = j; continue
        if c in '\'"`':
            parts, end = parse_literal(src, i)
            raw = src[i:end]
            prev = src[max(0, i-2):i]
            plain = ''.join(v for k, v in parts if k == 't')
            human = re.search(r'[A-Za-zÀ-ÿ]{2,}', plain) and (re.search(r'[A-Za-zÀ-ÿ]\s+[A-Za-zÀ-ÿ]', plain) or re.search(r'[àèéìòùÀÈÉÌÒÙ]', plain))
            classy = re.search(r'(^|\s)(text-|bg-|border|px-|py-|p-|m[trblxy]?-|rounded|flex|grid|gap-|w-|h-|absolute|relative|animate|hover:|items-|justify|space-|max-w|min-h|shadow|ring|opacity|overflow|font-|tracking|uppercase|transition|inline|sticky|z-|fixed|inset|block|hidden|sm:|md:|lg:|leading|truncate|cursor|select|top-|left-|right-|bottom-|translate|disabled:|shrink|whitespace|italic|underline)', plain)
            if human and not classy and not prev.endswith(('T(', 't(')):
                conv = convert(parts, c, fn)
                if conv: out.append(conv); n += 1; i = end; continue
            out.append(raw); i = end; continue
        out.append(c); i += 1
    return ''.join(out), n

if __name__ == '__main__' and len(sys.argv) > 3 and sys.argv[3] == 'all':
    f = sys.argv[1]; fn = sys.argv[2]
    s = open(f).read()
    # annulla l'effetto del primo passaggio già eseguito sopra (file già scritto): riprocessa
    res, n = process_all(s, fn)
    open(f, 'w').write(res)
    print('all', f, n)
