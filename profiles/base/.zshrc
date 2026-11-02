# The OpenPencil CLI finds the WSL MCP service through the discovery file the
# service writes for the Windows app; read the same path the unit uses.
export OPENPENCIL_MCP_DISCOVERY_PATH=/mnt/c/Users/Mark.Easterly/AppData/Local/OpenPencil/mcp.json
if [ -f "$HOME/.config/openpencil-mcp.env" ]; then
  _openpencil_discovery=$(sed -n 's/^OPENPENCIL_MCP_DISCOVERY_PATH=//p' "$HOME/.config/openpencil-mcp.env")
  [ -n "$_openpencil_discovery" ] && export OPENPENCIL_MCP_DISCOVERY_PATH=$_openpencil_discovery
  unset _openpencil_discovery
fi
