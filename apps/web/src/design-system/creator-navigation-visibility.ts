export type CreatorNavigationVisibilityItem = {
  label: string;
};

const HIDDEN_UNTIL_IMPLEMENTED = new Set(['Analytics']);

export function visibleCreatorNavigation<T extends CreatorNavigationVisibilityItem>(
  navigation: readonly T[],
): T[] {
  return navigation.filter((item) => !HIDDEN_UNTIL_IMPLEMENTED.has(item.label));
}
