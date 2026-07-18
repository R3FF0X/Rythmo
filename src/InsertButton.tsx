type Props = {
  onClick: () => void;
};

function InsertButton({ onClick }: Props) {
  return (
    <div className="flex justify-center py-0.5">
      <button
        onClick={onClick}
        className="w-6 h-6 rounded-full border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 text-sm flex items-center justify-center active:scale-90 transition-transform duration-100"
      >
        +
      </button>
    </div>
  );
}

export default InsertButton;
