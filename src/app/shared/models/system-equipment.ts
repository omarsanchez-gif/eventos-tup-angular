export type EquipmentClassification = 'fijo' | 'transferible';
export type EquipmentTimestamp =
  | Date
  | string
  | number
  | Readonly<{ toDate?: () => Date; seconds?: number; _seconds?: number }>
  | null;

export interface SystemEquipment {
  readonly documentId: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly campusBaseId: string;
  readonly cantidadOperativa: number;
  readonly clasificacion: EquipmentClassification;
  readonly campusDestinoIdsPermitidos: readonly string[];
  readonly activo: boolean;
  readonly utilizado: boolean;
  readonly fechaCreacion: EquipmentTimestamp;
  readonly fechaActualizacion: EquipmentTimestamp;
}
export interface SelectableEquipment {
  readonly equipoId: string;
  readonly nombre: string;
  readonly campusBaseId: string;
  readonly clasificacion: EquipmentClassification;
  readonly campusDestinoIdsPermitidos: readonly string[];
}
export interface CreateSystemEquipmentInput {
  readonly nombre: string;
  readonly campusBaseId: string;
  readonly cantidadOperativa: number;
  readonly clasificacion: EquipmentClassification;
  readonly campusDestinoIdsPermitidos: readonly string[];
  readonly activo: boolean;
}
export interface UpdateSystemEquipmentInput extends Omit<CreateSystemEquipmentInput, 'activo'> {
  readonly documentId: string;
}
export interface SetSystemEquipmentStatusInput {
  readonly documentId: string;
  readonly activo: boolean;
}
export interface EquipmentListResult {
  readonly items: readonly SystemEquipment[];
  readonly total: number;
  readonly maxSupported: 500;
}
export interface SelectableEquipmentListResult {
  readonly items: readonly SelectableEquipment[];
  readonly total: number;
}
export interface EquipmentMutationResult {
  readonly documentId: string;
  readonly status: 'completed';
}
