import type { AdvisorMode } from "../state.js";

export const ADVISOR_MODES: readonly AdvisorMode[] = ["manual", "auto", "on"];
export const ADVISOR_MODE_DEFAULT_COMMAND = "advisor.mode.set-default";

export type AdvisorModePickerOption = {
  title: string;
  value: AdvisorMode;
  description: string;
};

export type AdvisorModePickerInitial = {
  mode: AdvisorMode;
  defaultMode: AdvisorMode;
  explicit: boolean;
};

export function createAdvisorModePickerActions(input: {
  initial: AdvisorModePickerInitial;
  saveSession: (mode: AdvisorMode) => Promise<void>;
  saveDefault: (mode: AdvisorMode) => Promise<void>;
  onCurrentChange: (mode: AdvisorMode) => void;
  onDefaultChange: (mode: AdvisorMode) => void;
  onChanged: () => void;
  onClose: () => void;
}) {
  let highlighted = input.initial.mode;

  return {
    move(mode: AdvisorMode) {
      highlighted = mode;
    },
    highlighted() {
      return highlighted;
    },
    async setDefault() {
      await input.saveDefault(highlighted);
      input.onDefaultChange(highlighted);
      if (!input.initial.explicit) input.onCurrentChange(highlighted);
      input.onChanged();
    },
    async select(mode: AdvisorMode) {
      highlighted = mode;
      await input.saveSession(mode);
      input.onCurrentChange(mode);
      input.onChanged();
      input.onClose();
    },
    cancel() {
      input.onClose();
    },
  };
}

export function advisorModePickerLayer(runDefault: () => void | Promise<void>) {
  return {
    commands: [
      {
        name: ADVISOR_MODE_DEFAULT_COMMAND,
        title: "Set global advisor default",
        hidden: true,
        run: runDefault,
      },
    ],
    bindings: [
      {
        key: "shift+d",
        cmd: ADVISOR_MODE_DEFAULT_COMMAND,
        desc: "Set global advisor default",
      },
    ],
  } as const;
}

export function createAdvisorModePickerBindingController(
  register: (layer: ReturnType<typeof advisorModePickerLayer>) => () => void,
  runDefault: () => void | Promise<void>,
) {
  let unregister: (() => void) | undefined;
  return {
    open() {
      unregister?.();
      unregister = register(advisorModePickerLayer(runDefault));
    },
    close() {
      unregister?.();
      unregister = undefined;
    },
  };
}

export function advisorModePickerOptions(
  current: AdvisorMode,
  defaultMode: AdvisorMode,
): AdvisorModePickerOption[] {
  return ADVISOR_MODES.map((mode) => {
    const markers = [
      mode === current ? "current" : undefined,
      mode === defaultMode ? "default" : undefined,
    ].filter((value): value is string => value !== undefined);
    return {
      title: `${mode}${markers.length > 0 ? ` [${markers.join(", ")}]` : ""}`,
      value: mode,
      description:
        mode === "manual"
          ? "Automatic advisor guidance is disabled; explicitly ask to consult the advisor or use /consult-advisor."
          : mode === "auto"
            ? "Use workload-aware guidance and review when independent advice is valuable."
            : "Use the standard advisor invocation guidance.",
    };
  });
}
