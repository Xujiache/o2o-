import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('review_reply')
@Index('uk_review_reply_review', ['orderReviewId'], { unique: true })
@Index('idx_review_reply_store', ['storeId', 'createdAt'])
export class ReviewReply {
  @PrimaryGeneratedColumn({ name: 'review_reply_id', type: 'bigint' })
  reviewReplyId!: string;

  @Column({ name: 'order_review_id', type: 'bigint' })
  orderReviewId!: string;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ type: 'varchar', length: 500 })
  content!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
