"use server";

import "server-only";

import { listProducts } from "@/features/catalog/data/list-products";
import type { CatalogParams } from "@/features/catalog/schemas";

export async function getCatalogPage(params: CatalogParams) {
  return listProducts(params);
}
