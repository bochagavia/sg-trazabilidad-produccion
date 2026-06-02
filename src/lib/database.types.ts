/** Tipos alineados al esquema SQL; el cliente Supabase no usa genérico estricto. */

export type ProducerRow = {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
};

export type CaliberCodeRow = {
  id: string;
  code: string;
  label: string;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type BinLotRow = {
  id: string;
  public_id: string;
  producer_id: string;
  reception_date: string;
  caliber: string;
  caliber_code_id?: string | null;
  lote?: string | null;
  rack_percha?: string | null;
  kg_remaining: number | null;
  calibrated_at: string | null;
  created_at: string;
};

export type ProductionOrderRow = {
  id: string;
  client_name: string;
  op_number?: number | null;
  target_kg: number;
  status: string;
  notes: string | null;
  created_at: string;
};

export type ConsumptionRow = {
  id: string;
  production_order_id: string;
  bin_lot_id: string;
  kg: number;
  recorded_at: string;
};

/** Uso de bin: hora fijada al escanear (register_bin_use). */
export type BinUseRow = {
  id: string;
  bin_lot_id: string;
  used_at: string;
  kg: number;
  op_number?: string | null;
  client_name?: string | null;
};
