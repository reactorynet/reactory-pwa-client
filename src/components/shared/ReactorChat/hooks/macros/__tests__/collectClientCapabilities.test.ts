import { describe, it, expect } from "@jest/globals";
import { collectClientCapabilities } from "../../useChatFactory";

/**
 * Client capability advertisement.
 *
 * What a browser tells the server it can run. Getting this set wrong is not a
 * cosmetic problem: a tool the client can run but the server does not know is
 * client-routed goes unrecognised, the turn dies on a macro error, and the tool
 * is never forwarded to the browser that could execute it.
 *
 * This is the client half of the contract whose server half is covered by
 * `ReactorConversationService.clientTools.test.ts`.
 */
describe("collectClientCapabilities", () => {
  const chartMacro: any = {
    name: "ChartMacro",
    alias: "chart",
    nameSpace: "reactor-macros",
    version: "1.0.0",
    description: "Mount a chart",
    runat: "client",
    tools: [
      {
        type: "function",
        propsMap: { type: "type" },
        roles: ["USER"],
        function: {
          name: "chart",
          icon: "bar_chart",
          description: "Mount, update or remove a chart",
          parameters: { type: "object", properties: {} },
        },
      },
    ],
  };

  const shellMacro: any = {
    name: "ShellMacro",
    alias: "shell",
    runat: "server",
    tools: [{ type: "function", function: { name: "shell" } }],
  };

  it("selects only client-routed macros", () => {
    const { clientMacros } = collectClientCapabilities([chartMacro, shellMacro]);
    expect(clientMacros).toHaveLength(1);
    expect(clientMacros[0].alias).toBe("chart");
  });

  it("advertises a client macro's function tools as client-routed", () => {
    const { clientTools } = collectClientCapabilities([chartMacro]);
    expect(clientTools).toHaveLength(1);
    expect(clientTools[0].function.name).toBe("chart");
    // The server dispatches on `runat`; advertising a browser tool as anything
    // else would route it to a server macro that does not exist.
    expect(clientTools[0].runat).toBe("client");
  });

  it("does not advertise tools belonging to a server macro", () => {
    // `shell` runs on the server. Advertising it as a client tool would invite the
    // model to call it expecting browser execution.
    const { clientTools } = collectClientCapabilities([shellMacro]);
    expect(clientTools).toHaveLength(0);
  });

  it("carries the display metadata the tool list needs", () => {
    const { clientTools } = collectClientCapabilities([chartMacro]);
    expect(clientTools[0].function.icon).toBe("bar_chart");
    expect(clientTools[0].function.description).toMatch(/chart/i);
    expect(clientTools[0].propsMap).toEqual({ type: "type" });
    expect(clientTools[0].roles).toEqual(["USER"]);
  });

  it("deduplicates a tool declared by more than one macro", () => {
    // The server keys its tool set by name, so a duplicate is a duplicate entry
    // in the provider's tool list — which some providers reject outright.
    const secondDeclarant: any = {
      ...chartMacro,
      name: "OtherChartMacro",
      alias: "chart2",
    };

    const { clientTools } = collectClientCapabilities([chartMacro, secondDeclarant]);
    expect(clientTools).toHaveLength(1);
    expect(clientTools[0].function.name).toBe("chart");
  });

  it("ignores non-function and unnamed tool entries", () => {
    const macroWithNoise: any = {
      ...chartMacro,
      tools: [
        { type: "function", function: { name: "chart" } },
        { type: "retrieval", function: { name: "notACallableTool" } },
        { type: "function" }, // no name -> unusable
      ],
    };

    const { clientTools } = collectClientCapabilities([macroWithNoise]);
    expect(clientTools).toHaveLength(1);
    expect(clientTools[0].function.name).toBe("chart");
  });

  it("accepts a keyed-map registry as well as an array", () => {
    // The imported registry has been both shapes across versions, so the walk
    // must not assume one.
    const { clientMacros, clientTools } = collectClientCapabilities({
      chart: chartMacro,
      shell: shellMacro,
    } as any);

    expect(clientMacros).toHaveLength(1);
    expect(clientTools).toHaveLength(1);
  });

  it("returns empty results for an empty registry", () => {
    expect(collectClientCapabilities([])).toEqual({ clientMacros: [], clientTools: [] });
    expect(collectClientCapabilities({} as any)).toEqual({ clientMacros: [], clientTools: [] });
  });

  it("tolerates a client macro with no tools", () => {
    const noTools: any = { name: "BareMacro", alias: "bare", runat: "client" };
    const { clientMacros, clientTools } = collectClientCapabilities([noTools]);
    expect(clientMacros).toHaveLength(1);
    expect(clientTools).toHaveLength(0);
  });
});
