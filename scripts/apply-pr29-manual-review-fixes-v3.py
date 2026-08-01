from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'Expected one match in {path}, found {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'updated {path}')


css_path = Path('apps/web/src/design-system/manual-review-fixes.css')
replace_once(
    css_path,
    "margin-bottom: calc(82px + env(safe-area-inset-bottom));",
    "margin-bottom: calc(92px + env(safe-area-inset-bottom));",
)
replace_once(
    css_path,
    "margin-bottom: calc(96px + env(safe-area-inset-bottom));",
    "margin-bottom: calc(108px + env(safe-area-inset-bottom));",
)

test_path = Path('tests/ui/manual-review-regressions.spec.ts')
replace_once(
    test_path,
    """  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const actionBox = await page.getByRole('link', { name: 'Manage broadcast' }).boundingBox();
  const footerBox = await page.locator('.ds-listener-footer').boundingBox();
  expect(actionBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(actionBox!.y - 4);
""",
    """  await page.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'instant',
    }),
  );
  await page.waitForFunction(() =>
    Math.abs(
      window.scrollY + window.innerHeight - document.documentElement.scrollHeight,
    ) <= 4,
  );
  const footerAndAction = await page.evaluate(() => {
    const action = document.querySelector<HTMLElement>('.listener-call-in-role-action');
    const footer = document.querySelector<HTMLElement>('.ds-listener-footer');
    if (!action || !footer) return null;
    const actionRect = action.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    return {
      actionTop: actionRect.top,
      footerBottom: footerRect.bottom,
    };
  });
  expect(footerAndAction).not.toBeNull();
  expect(footerAndAction!.footerBottom).toBeLessThanOrEqual(
    footerAndAction!.actionTop - 4,
  );
""",
)

print('PR #29 fixed CTA regression correction applied successfully')
