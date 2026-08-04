#!/usr/bin/env bash
# kimi-free-install.sh — Ubuntu uchun moslashtirilgan variant
# Ishga tushirish: bash kimi-free-install.sh   (yoki: chmod +x kimi-free-install.sh && ./kimi-free-install.sh)
set -euo pipefail

# --- Clipboard o'qish (Ubuntu uchun pbpaste o'rniga) ---
read_clipboard() {
  if command -v xclip >/dev/null 2>&1; then
    xclip -selection clipboard -o
  elif command -v xsel >/dev/null 2>&1; then
    xsel --clipboard --output
  elif command -v wl-paste >/dev/null 2>&1; then
    wl-paste
  else
    echo "Clipboard vositasi topilmadi. O'rnating: sudo apt install xclip" >&2
    exit 1
  fi
}

TR_KEY=$(read_clipboard | tr -d '[:space:]')
case "$TR_KEY" in
  sk-*) ;;
  *) echo "Buferda TokenRouter kaliti yo'q. Kalitni nusxalab, skriptni qayta ishga tushiring."; exit 1 ;;
esac

echo "Kalitni tekshiryapman..."
CODE=$(curl -s -m 30 -o /dev/null -w "%{http_code}" https://api.tokenrouter.com/v1/models \
  -H "Authorization: Bearer $TR_KEY")
[ "$CODE" = "000" ] && { echo "api.tokenrouter.com bilan aloqa yo'q. Internet yoki VPN'ni tekshiring."; exit 1; }
[ "$CODE" = "200" ] || { echo "Kalit rad etildi: HTTP $CODE. TokenRouter'dagi kalitni tekshiring."; exit 1; }

export KIMI_CODE_HOME="$HOME/.kimi-free"
mkdir -p "$KIMI_CODE_HOME"
if [ ! -x "$KIMI_CODE_HOME/bin/kimi" ]; then
  echo "Kimi Code o'rnatilyapti..."
  curl -fsSL https://code.kimi.com/kimi-code/install.sh | bash
  if [ -x "$HOME/.kimi-code/bin/kimi" ] && [ ! -x "$KIMI_CODE_HOME/bin/kimi" ]; then
    mkdir -p "$KIMI_CODE_HOME/bin"
    cp -a "$HOME/.kimi-code/bin/kimi" "$KIMI_CODE_HOME/bin/kimi"
  fi
fi
[ -x "$KIMI_CODE_HOME/bin/kimi" ] || { echo "O'rnatish muvaffaqiyatsiz: $KIMI_CODE_HOME/bin/kimi topilmadi."; exit 1; }

cat > "$KIMI_CODE_HOME/config.toml" <<EOF
default_model = "tokenrouter/kimi-k3-free"

[providers.tokenrouter]
type = "openai"
base_url = "https://api.tokenrouter.com/v1"
api_key = "$TR_KEY"

[models."tokenrouter/kimi-k3-free"]
provider = "tokenrouter"
model = "moonshotai/kimi-k3-free"
max_context_size = 131072
capabilities = ["thinking", "tool_use"]

[thinking]
enabled = true
effort = "low"
EOF
chmod 600 "$KIMI_CODE_HOME/config.toml"

WRAPPER_DIR="/usr/local/bin"
[ -w "$WRAPPER_DIR" ] || WRAPPER_DIR="$HOME/.local/bin"
mkdir -p "$WRAPPER_DIR"
cat > "$WRAPPER_DIR/kimi-free" <<EOF
#!/usr/bin/env bash
export KIMI_CODE_HOME="\$HOME/.kimi-free"
exec "\$HOME/.kimi-free/bin/kimi" "\$@"
EOF
chmod 700 "$WRAPPER_DIR/kimi-free"

case ":$PATH:" in
  *":$WRAPPER_DIR:"*) ;;
  *)
    echo "PATH'ga qo'shing (zsh uchun ~/.zshrc fayliga yozing):"
    echo "  echo 'export PATH=\"$WRAPPER_DIR:\$PATH\"' >> ~/.zshrc && source ~/.zshrc"
    ;;
esac

echo "Ishga tushirishni tekshiryapman. Bepul tarif javob berishi bir necha daqiqa vaqt olishi mumkin..."
if command -v timeout >/dev/null 2>&1; then
  SMOKE_OUT=$(timeout 420 "$WRAPPER_DIR/kimi-free" -p 'Reply with exactly: OK' 2>&1 || true)
else
  SMOKE_OUT=$("$WRAPPER_DIR/kimi-free" -p 'Reply with exactly: OK' 2>&1 || true)
fi
if printf '%s\n' "$SMOKE_OUT" | grep -q OK; then
  echo "Tayyor. Buyruq: kimi-free"
else
  echo "O'rnatish tugadi, lekin tekshiruv OK javobini olmadi. Qo'lda tekshiring: kimi-free -p 'Reply with exactly: OK'"
fi