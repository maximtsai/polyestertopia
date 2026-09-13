#!/usr/bin/env python3
"""Dev server. Plain static files, but with caching turned off so an edited
module is picked up on reload (the browser otherwise caches ES modules)."""
import http.server, sys

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()
    def log_message(self, *args):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
print(f'Polyestertopia dev server: http://localhost:{port}/')
http.server.test(HandlerClass=Handler, port=port, bind='127.0.0.1')
