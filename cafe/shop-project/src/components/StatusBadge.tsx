import { STATUS_LABEL, STATUS_STYLE } from '@/lib/constants';

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_STYLE[status] || 'bg-gray-100'}`}>{STATUS_LABEL[status] || status}</span>;
}
