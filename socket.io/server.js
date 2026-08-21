const { Socket } = require("engine.io")
const express = require("express")
const http = require ("http")
const {Server} = require("socket.io")

const app = express()

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
})

io.on("connection",(socket) => {
    console.log("A user connected")

    socket.on("message", (data) => {
        console.log("A user disconnected")
        console.log(data)
        io.emit("message", `${data} yozildi`)
    })
})

server.listen(3000, () => {
    console.log("Server ishlayapti")
} )