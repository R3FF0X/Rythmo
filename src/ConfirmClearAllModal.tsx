import Modal from "./Modal";

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmClearAllModal({ onConfirm, onCancel }: Props) {
  return (
    <Modal onClose={onCancel}>
      {(close) => (
        <>
          <p className="text-white text-sm mb-4 text-center">
            Voulez-vous tout supprimer ? Cette action est irréversible.
          </p>
          <div className="flex gap-2">
            <button
              onClick={close}
              className="flex-1 py-2 rounded-lg border border-neutral-700 text-neutral-300 text-sm active:scale-95 transition-transform duration-100"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                onConfirm();
                close();
              }}
              className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium active:scale-95 transition-transform duration-100"
            >
              Tout supprimer
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default ConfirmClearAllModal;
