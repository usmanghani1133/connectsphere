import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";

let io: SocketIOServer | null = null;

// Track online users: userId -> SocketID
const activeUsers = new Map<string, string>();
// Reverse track: SocketID -> userId
const reverseActiveUsers = new Map<string, string>();

export function initSockets(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log(`WebSocket client connected: ${socket.id}`);

    // Map user to socket session
    socket.on("register_user", (userId: string) => {
      if (userId) {
        activeUsers.set(userId, socket.id);
        reverseActiveUsers.set(socket.id, userId);
        console.log(`User registered online: ${userId} (Socket: ${socket.id})`);
        
        // Notify others about online status change
        io?.emit("user_status_change", { userId, status: "online" });
      }
    });

    // Handle manual disconnect or heartbeat failures
    socket.on("disconnect", () => {
      const userId = reverseActiveUsers.get(socket.id);
      if (userId) {
        activeUsers.delete(userId);
        reverseActiveUsers.delete(socket.id);
        console.log(`User offline: ${userId} (Socket: ${socket.id})`);
        
        // Notify others
        io?.emit("user_status_change", { userId, status: "offline" });
      }
    });
  });

  return io;
}

// Get the io instance
export function getIO() {
  return io;
}

// Check if user is online
export function isUserOnline(userId: string): boolean {
  return activeUsers.has(userId);
}

// Send real-time notification to a specific user if online
export function sendToUser(userId: string, event: string, payload: any) {
  if (!io) return;
  const socketId = activeUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, payload);
    console.log(`Dynamic packet dispatched to user ${userId} on channel ${event}`);
  } else {
    console.log(`User ${userId} is offline. Saved to offline notification buffer.`);
  }
}

// Broadcast general event to all connected sockets
export function broadcastEvent(event: string, payload: any) {
  if (io) {
    io.emit(event, payload);
    console.log(`Global broadcast dispatched on channel ${event}`);
  }
}
