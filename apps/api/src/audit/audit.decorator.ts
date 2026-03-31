import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

export interface AuditActionMeta {
  action: string;
  entityType: string;
  entityIdParam?: string;
  reasonParam?: string;
}

export function AuditAction(meta: AuditActionMeta) {
  return SetMetadata(AUDIT_ACTION_KEY, meta);
}
