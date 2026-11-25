#!/bin/sh
# macOS: çift tıklayarak açın.
cd "$(dirname "$0")" || exit 1
for p in python3.14 python3.13 python3.12 python3.11 python3.10 python3 /opt/homebrew/bin/python3 /usr/local/bin/python3; do
  if command -v "$p" >/dev/null 2>&1 && "$p" -c 'import sys; sys.exit(sys.version_info < (3, 10))'; then
    exec "$p" baslat.py "$@"
  fi
done
echo "Python 3.10 veya üzeri bulunamadı: https://www.python.org/downloads/"
