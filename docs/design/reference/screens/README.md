# Approved DigiStream reference screens

This directory is reserved for the **50 original approved reference image files** listed in `../MANIFEST.md` and `../manifest.json`.

Do not substitute screenshots from the legacy blue/white pack, old dark-theme references, regenerated approximations, collages, contact sheets, or duplicate images.

After the original files are copied here, run:

```bash
npm run design:verify-references
```

The verifier requires all 50 filenames and exact SHA-256 hashes to match the approved pack.

Coding agents must not claim the full visual reference pack is installed until that command passes.
