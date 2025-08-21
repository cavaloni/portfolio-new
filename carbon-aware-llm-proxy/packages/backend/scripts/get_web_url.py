#!/usr/bin/env python3
"""
Helper script to retrieve the web URL of a deployed Modal function.

Usage:
  python3 get_web_url.py --app <APP_NAME> --function <FUNCTION_NAME>

This uses the Modal Python API and works even after deployment, serving as a
reliable fallback when CLI JSON output does not include the endpoint URL.
"""

import argparse
import sys

try:
    import modal  # type: ignore
except Exception as e:  # pragma: no cover
    print(f"ERROR: Could not import modal: {e}", file=sys.stderr)
    sys.exit(1)


def main() -> int:
    parser = argparse.ArgumentParser(description="Get Modal function web URL")
    parser.add_argument("--app", required=True, help="Modal app name")
    parser.add_argument(
        "--function", required=True, help="Modal function name (e.g. asgi-app)"
    )
    args = parser.parse_args()

    try:
        # Prefer lookup; fall back to from_name for older client versions
        try:
            remote_function = modal.Function.lookup(args.app, args.function)  # type: ignore[attr-defined]
        except Exception:
            remote_function = modal.Function.from_name(args.app, args.function)  # type: ignore[attr-defined]

        try:
            url = remote_function.get_web_url()
        except Exception:
            # Some versions expose it as a property
            url = getattr(remote_function, "web_url", None)

        if not url:
            return 2

        print(url)
        return 0
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())


