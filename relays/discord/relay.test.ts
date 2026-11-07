import { describe, expect, it } from "vitest";
import { shouldForward, type GatewayMessage } from "./relay.ts";

const filter = { channelID: "channel", ownerID: "owner" };

function message(overrides: Partial<GatewayMessage> = {}): GatewayMessage {
  return {
    id: "1",
    channel_id: "channel",
    content: "<@bot> hello",
    author: { id: "owner" },
    mentions: [{ id: "bot" }],
    ...overrides,
  };
}

describe("shouldForward", () => {
  it("forwards the owner's mention of the bot in the watched channel", () => {
    expect(shouldForward(message(), filter, "bot")).toBe(true);
  });

  it("ignores other channels, other authors, bots, and messages without the mention", () => {
    expect(shouldForward(message({ channel_id: "elsewhere" }), filter, "bot")).toBe(false);
    expect(shouldForward(message({ author: { id: "someone" } }), filter, "bot")).toBe(false);
    expect(shouldForward(message({ author: { id: "owner", bot: true } }), filter, "bot")).toBe(false);
    expect(shouldForward(message({ mentions: [{ id: "someone" }] }), filter, "bot")).toBe(false);
  });
});

