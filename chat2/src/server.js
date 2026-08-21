const express = require("express")
const cors = require("cors")
const pool = require("./db")
require("dotenv").config()
const http = require("http")
const {Server} = require("socket.io")

const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.json())

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

pool.connect((err,clent, release) => {
    if (err) {
        return console.error("Databasega ulanish xato")
    } else {
        release();
        console.log("Databasega ulandi..")
    }
})

app.get("?users", async (req, res) => {
    try {
        const users = await pool.query("SELECT * FROM users")
        res.json(users.rows)
    }catch(err){
        console.error(err.message)
    }
})

app.get("/message/:userId1/:userId2", async (req, res) =>{
    const {userId1, userId2}=req.params;
    try{
        const messages = await pool.query(
            `SELECT 
        m.id,
        m.message,
        m.created_at,
        m.sender_id,
        m.receiver_id,
        s.username AS sender_username,
        r.username AS receiver_username
       FROM messages m
       JOIN users s ON s.id = m.sender_id    -- Sender user
       JOIN users r ON r.id = m.receiver_id  -- Receiver user
       WHERE 
         (m.sender_id = $1 AND m.receiver_id = $2)
         OR
         (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
            [userId1, userId2],
        );
        res.json(message.rows)
    }catch(err){
        console.log(err.message)
        res.json(err.message)
    }
})


const onlineUsers = new Map()
io.on("connection", (socket) => {
    console.log("User connected..")

    socket.on("user:join", async (userId) => {
        onlineUsers.set(userId, socket.id)
        socket.userId = userId
        console.log(`user ${userId} online bo'lid`)
        io.emit("user:online", Array.from(onlineUsers.keys()))
    })

    socket.on("message:send", async (data) => {
        const {senderId, receiverId, message} = data;

        if (!message || message.trim() ==="") return;

        try{
            const result = await pool.query(
                `INSERT INTO message (sender_id, receiver_id, message) 
                VALUES ($1, $2, $3) 
                RETURNING id, sender_id, receiver_id, message, created_at`,
                [senderId, receiverId,message.trim()]
            );
            const saveMessage = result.rows[0];

            const userResult = await pool.query(
                "SELECT username FROM user WHERE id = $1",
                [senderId],
            );
            
            savedMessage.sender_username = userResult.rows[0]?.username;

            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId) {
                // Faqat receiver ga yuborish
                io.to(receiverSocketId).emit("message:receive", savedMessage);
            }

            socket.emit("message:sent", savedMessage);

            console.log(`💬 ${senderId} → ${receiverId}: ${message}`);
        } catch (err) {
            console.error("Xabar saqlashda xatolik:", err);
            socket.emit("message:error", { error: "Xabarni yuborib bo'lmadi" });
        }
    });

    socket.on("typing:start", ({ senderId, receiverId }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("typing:indicator", {
                userId: senderId,
                isTyping: true,
            });
        }
    });

    // --- User yozishni to'xtatdi ---
    socket.on("typing:stop", ({ senderId, receiverId }) => {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("typing:indicator", {
                userId: senderId,
                isTyping: false,
            });
        }
    });

    socket.on("disconnect", () => {
        if (socket.userId) {
            // Userni online listdan o'chirish
            onlineUsers.delete(socket.userId);
            console.log(`❌ User ${socket.userId} offline bo'ldi`);

            // Yangilangan online users listini broadcast qilish
            io.emit("users:online", Array.from(onlineUsers.keys()));
        }
    });
});


server.listen(process.env.PORT || 5000, () => {
    console.log("Server ishladi")
})



  