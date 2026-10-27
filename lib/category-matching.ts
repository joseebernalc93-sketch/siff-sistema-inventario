import type { Category } from "@/lib/types";

const SIMILAR_CATEGORY_MIN_LENGTH = 5;
const SIMILAR_CATEGORY_MAX_DISTANCE = 1;

type CategoryName = Pick<Category, "name" | "slug">;

export function slugifyCategory(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findSimilarCategory<T extends CategoryName>(
  categories: T[],
  name: string,
) {
  const targetSlug = slugifyCategory(name);
  const targetKey = normalizeCategoryKey(name);

  return (
    categories.find((category) => {
      const categorySlug = category.slug || slugifyCategory(category.name);
      const categoryKey = normalizeCategoryKey(category.name || category.slug);

      return (
        categorySlug === targetSlug ||
        areSimilarCategoryKeys(categoryKey, targetKey)
      );
    }) ?? null
  );
}

function normalizeCategoryKey(value: string) {
  return slugifyCategory(value).replace(/-/g, "");
}

function areSimilarCategoryKeys(left: string, right: string) {
  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  if (Math.min(left.length, right.length) < SIMILAR_CATEGORY_MIN_LENGTH) {
    return false;
  }

  return (
    getLevenshteinDistance(left, right) <= SIMILAR_CATEGORY_MAX_DISTANCE
  );
}

function getLevenshteinDistance(left: string, right: string) {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const distances: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => 0),
  );

  for (let row = 0; row < rows; row++) {
    distances[row][0] = row;
  }

  for (let column = 0; column < columns; column++) {
    distances[0][column] = column;
  }

  for (let row = 1; row < rows; row++) {
    for (let column = 1; column < columns; column++) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;

      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + substitutionCost,
      );

      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        distances[row][column] = Math.min(
          distances[row][column],
          distances[row - 2][column - 2] + 1,
        );
      }
    }
  }

  return distances[left.length][right.length];
}
