#!/usr/bin/env python3
"""Regenera a PWA a partir da ÚNICA interface-fonte Index.html.
Executar: python gerar_pwa.py
Depois publique os arquivos WEB listados no LEIA-ME-INSTALACAO.txt.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
src=(root/'Index.html').read_text(encoding='utf-8')
src=re.sub(r'<title>[^<]*</title>','<title>2º Cérebro | Studio 6.4 · App Android</title>',src,count=1)
head='<link rel="manifest" href="./manifest.webmanifest">\n<link rel="icon" href="./icon-192.png" sizes="192x192" type="image/png">\n<link rel="apple-touch-icon" href="./icon-192.png">\n<meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="2º Cérebro"><meta name="theme-color" content="#f5f7ff">\n'
src=src.replace('</head>',head+'</head>',1)
assert '<script>' in src and '</body>' in src
src=src.replace('<script>','<script src="./pwa-transport.js"></script>\n<script>',1)
src=src.replace('</body>','<script src="./pwa-install.js"></script>\n</body>',1)
(root/'index.html').write_text(src,encoding='utf-8')
print('PWA regenerada:',root/'index.html')
