export const CAMPUS_DAYS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;
export type CampusDay = (typeof CAMPUS_DAYS)[number];
export interface CampusScheduleDay {
  readonly operativo: boolean;
  readonly inicio: string | null;
  readonly fin: string | null;
}
export type CampusSchedule = Readonly<Record<CampusDay, CampusScheduleDay>>;
export type CampusTimestamp =
  | Date
  | string
  | number
  | Readonly<{ toDate?: () => Date; seconds?: number; _seconds?: number }>
  | null;

export interface SystemCampus {
  readonly documentId: string;
  readonly nombre: string;
  readonly nombreNormalizado: string;
  readonly clave: string;
  readonly direccion: string | null;
  readonly referencia: string | null;
  readonly activo: boolean;
  readonly utilizado: boolean;
  readonly horariosSistemas: CampusSchedule;
  readonly fechaCreacion: CampusTimestamp;
  readonly fechaActualizacion: CampusTimestamp;
}
export interface SelectableCampus {
  readonly campusId: string;
  readonly nombre: string;
  readonly clave: string;
  readonly direccion: string | null;
  readonly referencia: string | null;
}
export interface CreateSystemCampusInput {
  readonly nombre: string;
  readonly clave: string;
  readonly direccion: string | null;
  readonly referencia: string | null;
  readonly horariosSistemas: CampusSchedule;
  readonly activo: boolean;
}
export interface UpdateSystemCampusInput extends Omit<CreateSystemCampusInput, 'activo'> {
  readonly documentId: string;
}
export interface SetSystemCampusStatusInput {
  readonly documentId: string;
  readonly activo: boolean;
}
export interface CampusesListResult {
  readonly items: readonly SystemCampus[];
  readonly total: number;
  readonly maxSupported: 100;
}
export interface SelectableCampusesListResult {
  readonly items: readonly SelectableCampus[];
  readonly total: number;
}
export interface CampusMutationResult {
  readonly documentId: string;
  readonly status: 'completed';
}
