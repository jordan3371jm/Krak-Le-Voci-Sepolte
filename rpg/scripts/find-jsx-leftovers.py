import re,sys
for f in sys.argv[1:]:
    for n,line in enumerate(open(f),1):
        if not re.search(r'<\w|</', line): continue
        x=re.sub(r"\bT\('(?:[^'\\]|\\.)*'(?:,\s*\{[^}]*\})?\)","",line)
        x=re.sub(r"'(?:[^'\\]|\\.)*'|\"[^\"]*\"|`[^`]*`","",x)
        for _ in range(4): x=re.sub(r"\{[^{}]*\}","",x)
        x=re.sub(r"<[^<>]*>","",x)
        words=re.findall(r"[A-Za-zàèéìòù]{4,}",x)
        words=[w for w in words if w not in ('className','const','return','true','false','null','span','button','onClick','disabled')]
        if words: print(f"{f}:{n}: {' '.join(words)[:120]}")
