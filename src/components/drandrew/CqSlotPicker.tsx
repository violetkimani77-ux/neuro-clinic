import { timeLabel } from "~/lib/booking/practice";

/** Time slot grid — same contract as the Premium Clinic `PvSlotPicker`. */
interface CqSlotPickerProps {
  times: string[];
  disabled?: string[];
  selected: string | null;
  onSelect: (time: string) => void;
  label?: string;
}

export default function CqSlotPicker({ times, disabled = [], selected, onSelect, label = "Available times" }: CqSlotPickerProps) {
  const disabledSet = new Set(disabled);
  return (
    <div className="cq-time-grid" role="group" aria-label={label}>
      {times.map((t) => {
        const isDisabled = disabledSet.has(t);
        const isSelected = selected === t && !isDisabled;
        return (
          <button
            key={t}
            type="button"
            className={`cq-time${isSelected ? " cq-time--selected" : ""}`}
            disabled={isDisabled}
            aria-pressed={isSelected}
            aria-label={timeLabel(t)}
            onClick={() => onSelect(t)}
          >
            {timeLabel(t)}
          </button>
        );
      })}
    </div>
  );
}
