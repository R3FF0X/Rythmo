import { useState } from "react";
import type { ReactNode } from "react";

type Props = {
  onClose: () => void;
  children: (close: () => void) => ReactNode;
};

const ANIMATION_MS = 200;

function Modal({ onClose, children }: Props) {
  const [isClosing, setIsClosing] = useState(false);

  function close() {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(onClose, ANIMATION_MS);
  }

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] ${
        isClosing ? "modal-backdrop-out" : "modal-backdrop-in"
      }`}
      onClick={close}
    >
      <div
        className={`bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 w-full max-w-xs ${
          isClosing ? "modal-content-out" : "modal-content-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children(close)}
      </div>
    </div>
  );
}

export default Modal;
