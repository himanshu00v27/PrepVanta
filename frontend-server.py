from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import os

FRONTEND = Path(__file__).resolve().parent / "frontend"
os.chdir(FRONTEND)

class PrepVantaHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path

        if path != "/" and not Path(path).suffix:
            candidate = FRONTEND / (path.lstrip("/") + ".html")

            if candidate.is_file():
                self.path = path + ".html"

        return super().do_GET()

print("PrepVanta frontend running at http://localhost:5500", flush=True)
ThreadingHTTPServer(("127.0.0.1", 5500), PrepVantaHandler).serve_forever()
