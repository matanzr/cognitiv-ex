import http.server
import ssl

httpd = http.server.HTTPServer(('127.0.0.1', 443), http.server.SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket (httpd.socket, certfile='./localhost.pem', server_side=True)
httpd.serve_forever()