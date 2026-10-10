// Qualification scope only: gateway aliases have no usable family metadata in the current inventory.
export const gatewayMode = (id: string): "openai" | "anthropic" | undefined => {
  if (id === "sol" || id === "luna") return "openai"

  if (id === "sonnet" || id === "haiku") return "anthropic"

  return undefined
}
