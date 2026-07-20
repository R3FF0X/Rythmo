import CalendarLogo from "./CalendarLogo";

type Props = {
  isOpen: boolean;
};

function SideMenu({ isOpen }: Props) {
  return (
    <div
      className={`fixed inset-0 z-[70] bg-[#1b1d21] flex flex-col items-center transition-transform duration-500 ease-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!isOpen}
    >
      <div className="h-14 w-full flex-shrink-0 flex items-center justify-center">
        <CalendarLogo className="w-8 h-8" />
      </div>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-0.5 pb-12">
        <span className="text-white text-sm font-semibold">Rythmo</span>
        <span className="text-neutral-500 text-xs">v{__APP_VERSION__}</span>
      </div>
    </div>
  );
}

export default SideMenu;
