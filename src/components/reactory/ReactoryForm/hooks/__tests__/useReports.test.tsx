import React from "react";
import { act, renderHook } from "@testing-library/react-hooks";
import { useReports } from "../useReports";

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
      <div data-open={open ? "true" : "false"} onClick={onClose}>
        {children}
      </div>
    ),
    DropDownMenu: ({ menus, onSelect, icon }: any) => (
      <div data-icon={icon} data-menu-count={menus?.length || 0}>
        {menus?.map((menu: any) => (
          <button
            type="button"
            key={menu.id}
            onClick={(evt) => onSelect(evt, menu)}
            data-disabled={menu.disabled ? "true" : "false"}
          >
            {menu.title}
          </button>
        ))}
      </div>
    ),
    Material: {
      MaterialCore: {
        Button: ({ children }: any) => <button type="button">{children}</button>,
        Icon: ({ children }: any) => <span>{children}</span>,
      },
      MaterialIcons: {},
    },
  })),
  utils: {
    lodash: {
      isArray: jest.fn((value: any) => Array.isArray(value)),
    },
    template: jest.fn((source: string) => jest.fn(() => source)),
  },
  log: jest.fn(),
});

const createFormDefinition = (overrides: any = {}) => ({
  id: "test.Form@1.0.0",
  name: "Test Form",
  reports: [
    { title: "Report A", icon: "description", disabled: "false" },
    { title: "Report B", icon: "print", disabled: "true" },
  ],
  ...overrides,
});

describe("useReports", () => {
  let mockReactory: ReturnType<typeof createMockReactory>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReactory = createMockReactory();
    useReactory.mockImplementation(() => mockReactory);
  });

  it("returns null controls when formDefinition is missing", () => {
    const { result } = renderHook(() => useReports({ formDefinition: null } as any));

    expect(result.current.ReportButton).toBeNull();
    expect(result.current.ReportModal).toBeNull();
    expect(typeof result.current.toggleReport).toBe("function");
  });

  it("initializes and returns ReportModal + toggleReport with formDefinition", () => {
    const { result } = renderHook(() =>
      useReports({ formDefinition: createFormDefinition() } as any)
    );

    expect(result.current).toBeDefined();
    expect(typeof result.current.ReportModal).toBe("function");
    expect(typeof result.current.toggleReport).toBe("function");
  });

  it("requests required components from reactory.getComponents", () => {
    renderHook(() => useReports({ formDefinition: createFormDefinition() } as any));

    expect(mockReactory.getComponents).toHaveBeenCalledWith([
      "core.FullScreenModal",
      "core.DropDownMenu",
      "material-ui.Material",
    ]);
  });

  it("renders ReportModal closed by default", () => {
    const { result } = renderHook(() =>
      useReports({ formDefinition: createFormDefinition() } as any)
    );

    const modalElement = (result.current.ReportModal as any)({});
    expect(modalElement.props.open).toBe(false);
  });

  it("opens modal when toggleReport is called", () => {
    const { result } = renderHook(() =>
      useReports({ formDefinition: createFormDefinition() } as any)
    );

    act(() => {
      result.current.toggleReport();
    });

    const modalElement = (result.current.ReportModal as any)({});
    expect(modalElement.props.open).toBe(true);
  });

  it("closes modal when toggleReport is called twice", () => {
    const { result } = renderHook(() =>
      useReports({ formDefinition: createFormDefinition() } as any)
    );

    act(() => {
      result.current.toggleReport();
    });

    act(() => {
      result.current.toggleReport();
    });

    const modalElement = (result.current.ReportModal as any)({});
    expect(modalElement.props.open).toBe(false);
  });

  it("closes modal when ReportModal onClose is called", () => {
    const { result } = renderHook(() =>
      useReports({ formDefinition: createFormDefinition() } as any)
    );

    act(() => {
      result.current.toggleReport();
    });

    act(() => {
      const modalElement = (result.current.ReportModal as any)({});
      modalElement.props.onClose();
    });

    const modalElement = (result.current.ReportModal as any)({});
    expect(modalElement.props.open).toBe(false);
  });

  it("builds ReportButton dropdown when reports are available", () => {
    const { result } = renderHook(() =>
      useReports({ formDefinition: createFormDefinition() } as any)
    );

    expect(result.current.ReportButton).toBeDefined();
    expect((result.current.ReportButton as any).props.icon).toBe("print");
    expect((result.current.ReportButton as any).props.menus).toHaveLength(2);
  });

  it("maps report menu metadata and disabled flags", () => {
    const { result } = renderHook(() =>
      useReports({ formDefinition: createFormDefinition() } as any)
    );

    const menus = (result.current.ReportButton as any).props.menus;
    expect(menus[0]).toMatchObject({
      title: "Report A",
      icon: "description",
      id: "exportButton_0",
      key: 0,
      disabled: false,
    });
    expect(menus[1]).toMatchObject({
      title: "Report B",
      icon: "print",
      id: "exportButton_1",
      key: 1,
      disabled: true,
    });
  });

  it("logs selection when dropdown onSelect is triggered", () => {
    const { result } = renderHook(() =>
      useReports({ formDefinition: createFormDefinition() } as any)
    );

    const reportButton = result.current.ReportButton as any;
    const menuItem = reportButton.props.menus[0];
    reportButton.props.onSelect({ type: "click" }, menuItem);

    expect(mockReactory.log).toHaveBeenCalledWith("Report Item Selected", {
      evt: { type: "click" },
      menuItem,
    });
  });
});
