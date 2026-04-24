import QRCode from "react-qr-code";
import { buildBinQrPayload } from "../lib/qrPublicId";

export type BinLabelData = {
  publicId: string;
  kg?: number | null;
  producerName: string;
  receptionDate: string;
  caliber: string;
  lote?: string | null;
  /** Percha 1..161 (por bin), opcional. */
  rackPercha?: string | null;
};

type Props = {
  label: BinLabelData;
  className?: string;
};

export function BinLabelCard({ label, className = "" }: Props) {
  const qrValue = buildBinQrPayload({
    publicId: label.publicId,
    caliber: label.caliber,
    producerName: label.producerName,
    receptionDate: label.receptionDate,
    kg: label.kg,
  });
  return (
    <div
      className={`reception-print-sheet inline-block rounded-2xl border-2 border-zinc-900 bg-white p-6 print:border-black print:shadow-none ${className}`}
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <QRCode value={qrValue} size={168} level="M" />
        <div className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Ciruela · Materia prima
          </p>
          <p className="mt-1 text-2xl font-bold leading-tight text-zinc-900">
            {label.caliber}
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Calibre (UL°)
          </p>
          <p className="mt-2 text-base font-semibold text-zinc-900">
            {label.producerName}
          </p>
          <p className="text-sm text-zinc-600">Productor</p>
          {label.lote && (
            <p className="mt-1 text-sm text-zinc-800">
              Lote: {label.lote}
            </p>
          )}
          <p className="mt-1 text-sm text-zinc-700">
            Fecha pesaje: {label.receptionDate}
          </p>
          {label.kg != null && label.kg > 0 && (
            <p className="text-sm font-semibold text-zinc-900">
              Kg: {Number(label.kg).toFixed(3)} kg
            </p>
          )}
          {label.rackPercha != null && label.rackPercha !== "" && (
            <p className="text-sm text-zinc-700">Percha: {label.rackPercha}</p>
          )}
          <p className="mt-3 font-mono text-xs text-zinc-500 break-all">
            ID: {label.publicId}
          </p>
        </div>
      </div>
    </div>
  );
}
