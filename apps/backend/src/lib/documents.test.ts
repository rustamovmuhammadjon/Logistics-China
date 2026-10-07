import { describe, expect, it } from "vitest";
import { TRUCK_DOCUMENT_TYPES, truckDocumentExtension } from "@logistics/shared";

describe("truckDocumentExtension", () => {
  it("accepts PDF, Word, Excel and JPG/PNG, in any case", () => {
    for (const name of ["CMR.pdf", "old.doc", "CI.docx", "PL.XLSX", "pl.xls", "scan.JPG", "photo.jpeg", "page.png"]) {
      expect(truckDocumentExtension(name), name).not.toBeNull();
    }
  });

  it("rejects anything else", () => {
    for (const name of ["notes.txt", "pic.gif", "archive.zip", "script.js", "no-extension"]) {
      expect(truckDocumentExtension(name), name).toBeNull();
    }
  });

  it("types every extension with the MIME storage will check", () => {
    expect(TRUCK_DOCUMENT_TYPES.jpg).toBe("image/jpeg");
    expect(TRUCK_DOCUMENT_TYPES.jpeg).toBe("image/jpeg");
    expect(TRUCK_DOCUMENT_TYPES.xlsx).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });
});
