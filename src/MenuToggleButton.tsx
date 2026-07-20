type Props = {
  isOpen: boolean;
  onClick: () => void;
};

function MenuToggleButton({ isOpen, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
      className="relative w-8 h-8 flex-shrink-0 flex flex-col items-center justify-center gap-1.5 active:scale-90 transition-transform duration-100"
    >
      <span
        className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 ease-out ${
          isOpen ? "translate-y-2 rotate-45" : ""
        }`}
      />
      <span
        className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 ease-out ${
          isOpen ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 ease-out ${
          isOpen ? "-translate-y-2 -rotate-45" : ""
        }`}
      />
    </button>
  );
}

export default MenuToggleButton;
