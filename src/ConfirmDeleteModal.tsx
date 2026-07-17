import Modal from "./Modal";

type Props = {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDeleteModal({ label, onConfirm, onCancel }: Props) {
  return (
    <Modal onClose={onCancel}>
      <p className="text-white text-sm mb-4">
        Êtes-vous sûr de vouloir supprimer{" "}
        <span className="font-semibold">« {label} »</span> ?
      </p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 text-sm"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium"
        >
          Supprimer
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDeleteModal;
