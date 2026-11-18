# Elenca i letterali con testo umano non ancora avvolti in t()/T()
import re, sys
for f in sys.argv[1:]:
    for n, line in enumerate(open(f), 1):
        if line.strip().startswith(('import', '//', '*')): continue
        for m in re.finditer(r"(?<![tT]\()('(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|\"(?:[^\"\\\n]|\\.)*\")", line):
            lit = m.group(1)[1:-1]
            plain = re.sub(r'\$\{[^}]*\}', '', lit)
            if re.search(r'(className|text-|bg-|border|px-|py-|rounded|flex|grid|gap-|w-|h-|absolute|animate|hover:|items-|justify|mt-|mb-|ml-|space-|max-w|min-h|shadow|ring|opacity|overflow|font-|tracking|uppercase|transition|inline|sticky|z-)', plain): continue
            if re.search(r'[A-Za-zÀ-ÿ]{3,}\s+[A-Za-zÀ-ÿ]{2,}', plain) or re.search(r'[àèéìòù]', plain):
                print(f'{f}:{n}: {lit[:110]}')
