#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

# Change to the directory containing the files
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

try:
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server")
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
