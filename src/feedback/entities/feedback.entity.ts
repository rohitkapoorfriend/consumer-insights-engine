import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: false })
  text!: string;

  @Column({ type: 'varchar', default: 'manual' })
  source!: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @Column({ type: 'float', array: true, nullable: true })
  embedding!: number[] | null;

  @Column({ type: 'varchar', nullable: true })
  sentiment!: string | null;

  @Column({ type: 'float', nullable: true, name: 'sentiment_score' })
  sentimentScore!: number | null;

  @Column({ type: 'boolean', default: false })
  processed!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
