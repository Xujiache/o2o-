import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('order_review')
@Index('uk_order_review_main', ['orderId'], { unique: true })
@Index('idx_order_review_store_rating', ['storeId', 'rating', 'createdAt'])
@Index('idx_order_review_customer', ['customerId', 'createdAt'])
export class OrderReview {
  @PrimaryGeneratedColumn({ name: 'order_review_id', type: 'bigint' })
  orderReviewId!: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ type: 'tinyint' })
  rating!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  content!: string | null;

  @Column({ name: 'image_file_ids', type: 'json', nullable: true })
  imageFileIds!: string[] | null;

  @Column({ type: 'tinyint', default: 0 })
  anonymous!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
