export type CoordinationTimestamp =
  | Date
  | string
  | number
  | Readonly<{
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
    }>
  | null;

export interface SystemCoordination {
  readonly documentId: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly correos: readonly string[];
  readonly activo: boolean;
  readonly utilizada: boolean;
  readonly fechaCreacion: CoordinationTimestamp;
  readonly fechaActualizacion: CoordinationTimestamp;
}

export interface SelectableCoordination {
  readonly coordinacionId: string;
  readonly nombre: string;
}

export interface CreateSystemCoordinationInput {
  readonly nombre: string;
  readonly correos: readonly string[];
  readonly activo: boolean;
}

export interface UpdateSystemCoordinationInput {
  readonly documentId: string;
  readonly nombre: string;
  readonly correos: readonly string[];
}

export interface SetSystemCoordinationStatusInput {
  readonly documentId: string;
  readonly activo: boolean;
}

export interface CoordinationsListResult {
  readonly items: readonly SystemCoordination[];
  readonly total: number;
  readonly maxSupported: 500;
}

export interface SelectableCoordinationsListResult {
  readonly items: readonly SelectableCoordination[];
  readonly total: number;
}

export interface CoordinationMutationResult {
  readonly documentId: string;
  readonly status: 'completed';
}
