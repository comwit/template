import { resolveActions } from "@/lib/utils";
export * from "./types";
import { findAll } from "./actions/find-all";
import { find } from "./actions/find";
import { save } from "./actions/save";
import { archive } from "./actions/archive";
import { categories } from "./actions/categories";
import { saveCategory } from "./actions/save-category";
export const adminCatalog = resolveActions({
  findAll,
  find,
  save,
  archive,
  categories,
  saveCategory,
});
