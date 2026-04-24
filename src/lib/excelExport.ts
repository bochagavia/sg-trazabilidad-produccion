import * as XLSX from "xlsx";

const MAX_SHEET_NAME = 31;

/**
 * Genera y descarga un .xlsx con una sola hoja.
 */
export function downloadExcel(
  filename: string,
  sheetName: string,
  header: string[],
  dataRows: (string | number)[][]
) {
  const aoa: (string | number)[][] = [header, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  const safeName =
    sheetName.length > MAX_SHEET_NAME
      ? sheetName.slice(0, MAX_SHEET_NAME)
      : sheetName;
  XLSX.utils.book_append_sheet(wb, ws, safeName);
  XLSX.writeFile(wb, filename);
}
