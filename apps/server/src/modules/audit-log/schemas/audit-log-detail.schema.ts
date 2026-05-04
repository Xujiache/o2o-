import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ collection: 'audit_log_detail', timestamps: false })
export class AuditLogDetail {
  @Prop({ index: true }) traceId!: string;
  @Prop() auditLogId?: string;
  @Prop({ type: Object }) request?: Record<string, unknown>;
  @Prop({ type: Object }) response?: unknown;
  @Prop() createdAt!: number;
}

export type AuditLogDetailDocument = HydratedDocument<AuditLogDetail>;
export const AuditLogDetailSchema = SchemaFactory.createForClass(AuditLogDetail);
AuditLogDetailSchema.index({ createdAt: -1 });
