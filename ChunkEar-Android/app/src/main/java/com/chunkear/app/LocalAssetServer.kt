package com.chunkear.app

import android.content.res.AssetManager
import android.webkit.MimeTypeMap
import java.io.*
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.util.concurrent.Executors

/**
 * 嵌入式的本地 HTTP 服务器，从 assets 目录提供静态文件。
 * WebView 通过 localhost 加载页面，使 speechSynthesis 等需要安全上下文的 API 可用。
 */
class LocalAssetServer(private val assets: AssetManager, port: Int) {

    private val serverSocket = ServerSocket(port, 10, java.net.InetAddress.getByName("127.0.0.1"))
    private val threadPool = Executors.newCachedThreadPool()
    private var running = true

    val port: Int get() = serverSocket.localPort

    /** 获取 WebView 加载的根 URL */
    val baseUrl: String get() = "http://127.0.0.1:${serverSocket.localPort}/"

    fun start() {
        threadPool.submit {
            while (running) {
                try {
                    val client = serverSocket.accept()
                    threadPool.submit { handleClient(client) }
                } catch (_: Exception) {
                    if (!running) break
                }
            }
        }
    }

    fun stop() {
        running = false
        try { serverSocket.close() } catch (_: Exception) {}
        threadPool.shutdown()
    }

    private fun handleClient(client: Socket) {
        try {
            client.use { socket ->
                val reader = BufferedReader(InputStreamReader(socket.getInputStream()))
                val requestLine = reader.readLine() ?: return
                val parts = requestLine.split(" ")
                if (parts.size < 2 || parts[0] != "GET") {
                    sendResponse(socket, 400, "text/plain", "Bad Request")
                    return
                }

                var path = URLDecoder.decode(parts[1], "UTF-8")
                if (path == "/") path = "/index.html"
                // 防止路径遍历
                val safePath = path.dropWhile { it == '/' }

                try {
                    val inputStream = assets.open(safePath)
                    val ext = safePath.substringAfterLast('.', "")
                    val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
                        ?: "application/octet-stream"
                    val data = inputStream.readBytes()
                    sendResponse(socket, 200, mime, data)
                } catch (_: FileNotFoundException) {
                    sendResponse(socket, 404, "text/plain", "Not Found")
                }
            }
        } catch (_: Exception) {
            // 客户端断开等忽略
        }
    }

    private fun sendResponse(socket: Socket, status: Int, mime: String, body: String) {
        sendResponse(socket, status, mime, body.toByteArray())
    }

    private fun sendResponse(socket: Socket, status: Int, mime: String, data: ByteArray) {
        val statusText = when (status) {
            200 -> "OK"; 400 -> "Bad Request"; 404 -> "Not Found"
            else -> "Internal Server Error"
        }
        val writer = BufferedWriter(OutputStreamWriter(socket.getOutputStream()))
        writer.write("HTTP/1.1 $status $statusText\r\n")
        writer.write("Content-Type: $mime\r\n")
        writer.write("Content-Length: ${data.size}\r\n")
        writer.write("Connection: close\r\n")
        writer.write("\r\n")
        writer.flush()
        socket.getOutputStream().write(data)
        socket.getOutputStream().flush()
    }
}
