import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, loading }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3 mb-6">
        <div className="p-2 bg-red-100 rounded-full shrink-0">
          <AlertTriangle size={20} className="text-red-600" />
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Отмена</button>
        <button onClick={onConfirm} disabled={loading} className="btn-danger">
          {loading ? 'Удаление...' : 'Удалить'}
        </button>
      </div>
    </Modal>
  );
}
