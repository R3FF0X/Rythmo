import type { ReactNode } from "react";

type Props = {
  onClose: () => void;
  children: ReactNode;
};

function Modal({ onClose, children }: Props) {
  return (
    <div
      className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
      onClick={onClose}
    >
      <div
        className="modal-content bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;
