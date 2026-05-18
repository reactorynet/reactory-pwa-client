import React from "react";
import { act, renderHook } from "@testing-library/react-hooks";
import { useExports } from "../useExports";

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

const { useReactory } = require("@reactory/client-core/api");

const createMockReactory = () => ({
  getComponents: jest.fn(() => ({
    FullScreenModal: ({ open, onClose, children }: any) => (
      <div data-testid="fullscreen-modal" data-open={open ? "true" : "false"} onClick={onClose}>
        {children}
      </div>
    ),
    Material: {
      MaterialCore: {
        Button: ({ children, onClick, ...props }: any) => (
          <button type="button" onClick={onClick} {...props}>
            {children}
          </button>
        ),
        Icon: ({ children }: any) => <span>{children}</span>,
      },
      MaterialIcons: {},
    },
  })),
});

const createFormDefinition = (overrides: any = {}) => ({
  id: "test.Form@1.0.0",
  name: "Test Form",
  title: "Test Form",
  ...overrides,
});

describe("useExports", () => {
  let mockReactory: ReturnType<typeof createMockReactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReactory = createMockReactory();
    useReactory.mockImplementation(() => mockReactory);
  });

  it("initializes and returns ExportModal and ExportButton", () => {
    const { result } = renderHook(() =>
      useExports({
        formDefinition: createFormDefinition() as any,
        formData: {},
      } as any)
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current.ExportModal).toBe("function");
    expect(typeof result.current.ExportButton).toBe("function");
  });

  it("requests required components from reactory.getComponents", () => {
    renderHook(() =>
      useExports({
        formDefinition: createFormDefinition() as any,
        formData: {},
      } as any)
    );

    expect(mockReactory.getComponents).toHaveBeenCalledWith([
      "core.FullScreenModal",
      "material-ui.Material",
    ]);
  });

  it("renders ExportModal closed by default", () => {
    const { result } = renderHook(() =>
      useExports({
        formDefinition: createFormDefinition() as any,
        formData: {},
      } as any)
    );

    const modalElement = (result.current.ExportModal as any)({});
    expect(modalElement.props.open).toBe(false);
  });

  it("renders ExportButton with file icon", () => {
    const { result } = renderHook(() =>
      useExports({
        formDefinition: createFormDefinition() as any,
        formData: {},
      } as any)
    );

    const buttonElement = (result.current.ExportButton as any)({});
    expect(buttonElement.props.variant).toBe("text");
    expect(buttonElement.props.color).toBe("secondary");
    expect(buttonElement.props.children.props.children).toBe("file");
  });

  it("toggles modal state open when ExportButton is clicked", () => {
    const { result } = renderHook(() =>
      useExports({
        formDefinition: createFormDefinition() as any,
        formData: {},
      } as any)
    );

    const buttonElement = (result.current.ExportButton as any)({});
    act(() => {
      buttonElement.props.onClick();
    });

    const modalElement = (result.current.ExportModal as any)({});
    expect(modalElement.props.open).toBe(true);
  });

  it("toggles modal state closed when ExportButton is clicked twice", () => {
    const { result } = renderHook(() =>
      useExports({
        formDefinition: createFormDefinition() as any,
        formData: {},
      } as any)
    );

    act(() => {
      const buttonElement = (result.current.ExportButton as any)({});
      buttonElement.props.onClick();
    });

    act(() => {
      const buttonElement = (result.current.ExportButton as any)({});
      buttonElement.props.onClick();
    });

    const modalElement = (result.current.ExportModal as any)({});
    expect(modalElement.props.open).toBe(false);
  });

  it("closes modal when ExportModal onClose is called", () => {
    const { result } = renderHook(() =>
      useExports({
        formDefinition: createFormDefinition() as any,
        formData: {},
      } as any)
    );

    act(() => {
      const buttonElement = (result.current.ExportButton as any)({});
      buttonElement.props.onClick();
    });

    act(() => {
      const modalElement = (result.current.ExportModal as any)({});
      modalElement.props.onClose();
    });

    const modalElement = (result.current.ExportModal as any)({});
    expect(modalElement.props.open).toBe(false);
  });

  it("handles null formData safely", () => {
    const { result } = renderHook(() =>
      useExports({
        formDefinition: createFormDefinition() as any,
        formData: null,
      } as any)
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current.ExportButton).toBe("function");
  });

  it("handles undefined formData safely", () => {
    const { result } = renderHook(() =>
      useExports({
        formDefinition: createFormDefinition() as any,
        formData: undefined,
      } as any)
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current.ExportModal).toBe("function");
  });
});
