/** Standard Locus API success envelope */
export type LocusSuccess<T> = { success: true; data: T };

/** Standard Locus API error envelope */
export type LocusError = {
  success: false;
  error: string;
  message: string;
};

export type LocusResponse<T> = LocusSuccess<T> | LocusError;

export type LocusPaymentStatus =
  | "QUEUED"
  | "PENDING"
  | "PROCESSING"
  | "CONFIRMED"
  | "FAILED"
  | "POLICY_REJECTED"
  | "VALIDATION_FAILED"
  | "CANCELLED"
  | "EXPIRED";
