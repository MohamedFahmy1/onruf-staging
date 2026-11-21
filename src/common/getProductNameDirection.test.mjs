import assert from "node:assert/strict"
import test from "node:test"
import { getProductNameDirection } from "./getProductNameDirection.mjs"

test("product name direction follows the first word of the displayed name", () => {
  for (const name of ["منتج جديد", "  منتج English", "\n(مُنتج) English", "ﷲ منتج"]) {
    assert.equal(getProductNameDirection(name), "rtl", name)
  }
  for (const name of ["Product name", "Product منتج", "123 منتج", "", "   ", "-", null, undefined]) {
    assert.equal(getProductNameDirection(name), "ltr", String(name))
  }

  const product = { nameAr: null, nameEn: null, name: "منتج English" }
  assert.equal(getProductNameDirection(product.name), "rtl")
})
