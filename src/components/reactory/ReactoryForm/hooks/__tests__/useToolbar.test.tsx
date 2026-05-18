import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react-hooks";
import { useToolbar } from "../useToolbar";

jest.mock("localforage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  config: jest.fn(() => ({
    driver: {},
    INDEXEDDB: "indexeddb",
    WEBSQL: "websql",
    LOCALSTORAGE: "localstorage",
  })),
  setDriver: jest.fn(() => Promise.resolve()),
  keys: jest.fn(() => Promise.resolve([])),
  length: jest.fn(() => Promise.resolve(0)),
  INDEXEDDB: "indexeddb",
  WEBSQL: "websql",
  LOCALSTORAGE: "localstorage",
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@reactory/client-core/api");

jest.mock("react-router", () => ({
  useNavigate: jest.fn(),
}));

jest.mock("@mui/material", () => {
  const ReactLocal = require("react");
  return {
    Button: ({ children, ...props }: any) =>
      ReactLocal.createElement("button", props, children),
    Icon: ({ children, ...props }: any) =>
      ReactLocal.createElement("i", props, children),
    Toolbar: ({ children, ...props }: any) =>
      ReactLocal.createElement("div", props, children),
    Tooltip: ({ children, title }: any) =>
      ReactLocal.createElement("div", { "data-testid": "tooltip", "data-title": title }, children),
  };
});

const { useReactory } = require("@reactory/client-core/api");
const { useNavigate } = require("react-router");

const createMockReactory = () => ({
  utils: {
    template: jest.fn((tpl: string) => jest.fn(() => tpl)),
    lodash: {
      isNil: jest.fn((value: any) => value === null || value === undefined),
    },
  },
  muiTheme: {
    palette: {
      background: {
        paper: "#fff",
      },
    },
  },
  i18n: {
    t: jest.fn((text: string) => text),
  },
  log: jest.fn(),
  createNotification: jest.fn(),
});

const createFormDefinition = (overrides: any = {}) => ({
  id: "test.Form@1.0.0",
  name: "Test Form",
  title: "Test Form",
  uiSchema: {
    submitIcon: "save",
  },
  backButton: false,
  helpTopics: ["topic-a"],
  ...overrides,
});

const createUIOptions = (overrides: any = {}) => ({
  toolbarPosition: "bottom",
  submitIcon: "save_as",
  showSubmit: true,
  showHelp: true,
  showRefresh: true,
  submitProps: {
    variant: "contained",
    text: "Submit",
    tooltip: "Submit this form",
  },
  buttons: [],
  ...overrides,
});

describe("useToolbar", () => {
  let mockReactory: ReturnType<typeof createMockReactory>;
  let mockNavigate: jest.Mock;

  const buildProps = (overrides: any = {}) => ({
    formDefinition: createFormDefinition(overrides.formDefinition),
    formContext: {},
    uiOptions: createUIOptions(overrides.uiOptions),
    onSubmit: jest.fn(),
    SubmitButton: () => <button type="button">SubmitButton</button>,
    formData: {},
    errorSchema: {},
    errors: [],
    SchemaSelector: undefined,
    refresh: jest.fn(),
    toggleHelp: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockReactory = createMockReactory();
    mockNavigate = jest.fn();
    useReactory.mockImplementation(() => mockReactory);
    useNavigate.mockImplementation(() => mockNavigate);
  });

  it("initializes and returns Toolbar + toolbarPosition", () => {
    const { result } = renderHook(() => useToolbar(buildProps() as any));
    expect(result.current).toBeDefined();
    expect(typeof result.current.Toolbar).toBe("function");
    expect((result.current as any).toolbarPosition).toBe("bottom");
  });

  it("uses toolbarPosition from uiOptions", () => {
    const { result } = renderHook(() =>
      useToolbar(buildProps({ uiOptions: { toolbarPosition: "top" } }) as any)
    );
    expect((result.current as any).toolbarPosition).toBe("top");
  });

  it("calls useReactory during initialization", () => {
    renderHook(() => useToolbar(buildProps() as any));
    expect(useReactory).toHaveBeenCalled();
  });

  it("renders submit button when showSubmit is true", () => {
    const { result } = renderHook(() => useToolbar(buildProps() as any));
    render(<result.current.Toolbar />);
    expect(screen.getByText("SubmitButton")).toBeInTheDocument();
  });

  it("hides submit button when showSubmit is false", () => {
    const { result } = renderHook(() =>
      useToolbar(buildProps({ uiOptions: { showSubmit: false } }) as any)
    );
    render(<result.current.Toolbar />);
    expect(screen.queryByText("SubmitButton")).not.toBeInTheDocument();
  });

  it("calls refresh when refresh button is clicked", () => {
    const refresh = jest.fn();
    const { result } = renderHook(() => useToolbar(buildProps({ refresh }) as any));
    render(<result.current.Toolbar />);
    fireEvent.click(screen.getByText("refresh").closest("button") as HTMLElement);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("renders help button when help topics exist", () => {
    const { result } = renderHook(() => useToolbar(buildProps() as any));
    render(<result.current.Toolbar />);
    expect(screen.getByText("help")).toBeInTheDocument();
  });

  it("calls toggleHelp when help button is clicked", () => {
    const toggleHelp = jest.fn();
    const { result } = renderHook(() => useToolbar(buildProps({ toggleHelp }) as any));
    render(<result.current.Toolbar />);
    fireEvent.click(screen.getByText("help").closest("button") as HTMLElement);
    expect(toggleHelp).toHaveBeenCalledTimes(1);
  });

  it("renders back button when backButton is true", () => {
    const { result } = renderHook(() =>
      useToolbar(buildProps({ formDefinition: { backButton: true } }) as any)
    );
    render(<result.current.Toolbar />);
    expect(screen.getByText("BACK")).toBeInTheDocument();
  });

  it("renders SchemaSelector when enabled", () => {
    const SchemaSelector = () => <div>Schema Selector</div>;
    const { result } = renderHook(() =>
      useToolbar(
        buildProps({
          SchemaSelector,
          uiOptions: { showSchemaSelectorInToolbar: true },
        }) as any
      )
    );
    render(<result.current.Toolbar />);
    expect(screen.getByText("Schema Selector")).toBeInTheDocument();
  });

  it("navigates when additional button command is nav://", () => {
    const { result } = renderHook(() =>
      useToolbar(
        buildProps({
          uiOptions: {
            buttons: [
              {
                command: "nav://my-path",
                buttonProps: { title: "Go" },
                icon: "arrow_forward",
              },
            ],
          },
        }) as any
      )
    );

    render(<result.current.Toolbar />);
    fireEvent.click(screen.getByText("Go"));
    expect(mockNavigate).toHaveBeenCalledWith("/my-path");
  });

  it("invokes custom handler for additional button", () => {
    const customAction = jest.fn();
    const { result } = renderHook(() =>
      useToolbar(
        buildProps({
          customAction,
          uiOptions: {
            buttons: [
              {
                handler: "customAction",
                buttonProps: { title: "Run custom" },
                icon: "play_arrow",
              },
            ],
          },
        }) as any
      )
    );

    render(<result.current.Toolbar />);
    fireEvent.click(screen.getByText("Run custom"));
    expect(customAction).toHaveBeenCalledTimes(1);
  });

  it("creates notification for additional button when no command and no handler", () => {
    const { result } = renderHook(() =>
      useToolbar(
        buildProps({
          uiOptions: {
            buttons: [
              {
                buttonProps: { title: "No action" },
                icon: "warning",
              },
            ],
          },
        }) as any
      )
    );

    render(<result.current.Toolbar />);
    fireEvent.click(screen.getByText("No action"));
    expect(mockReactory.createNotification).toHaveBeenCalledTimes(1);
  });

  it("supports uiSchema icon fallback variants without crashing", () => {
    const variations = [
      { uiSchema: { submitIcon: "done" } },
      { uiSchema: { "ui:options": { submitIcon: "check" } } },
      { uiSchema: { "ui:form": { submitIcon: "save" } } },
    ];

    variations.forEach((variation) => {
      const { result } = renderHook(() =>
        useToolbar(
          buildProps({
            formDefinition: createFormDefinition(variation),
            uiOptions: { submitIcon: undefined },
          }) as any
        )
      );
      expect(result.current).toBeDefined();
      expect(typeof result.current.Toolbar).toBe("function");
    });
  });
});
