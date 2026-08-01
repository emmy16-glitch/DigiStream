from pathlib import Path

path = Path('apps/web/src/design-system/listener-trust.css')
text = path.read_text(encoding='utf-8')
old = """.ds-listener-shell:has(.listener-live-badge.scheduled) .listener-orb::after {
  content: 'UPCOMING';
  color: rgba(255, 255, 255, .075);
  font-size: clamp(2.4rem, 8vw, 4.8rem);
  letter-spacing: -.045em;
}
"""
new = """.ds-listener-shell:has(.listener-live-badge.scheduled) .listener-orb::after {
  content: none;
}
"""
count = text.count(old)
if count != 1:
    raise RuntimeError(f'Expected one scheduled orb rule, found {count}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('updated apps/web/src/design-system/listener-trust.css')
