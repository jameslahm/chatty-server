import express, { Application } from "express";
import socketIO, { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import path from "path";

interface User {
  uid: string;
  displayName: string;
  photoURL: string;
  socketId: string;
}

export class Server {
  private httpServer: HTTPServer;
  private app: Application;
  private io: SocketIOServer;
  private activeSockets: User[] = [];
  private readonly DEFAULT_PORT = 5000;

  constructor() {
    this.initialize();
    this.handleRoutes();
    this.handleSocketConnection();
  }

  private initialize(): void {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = socketIO(this.httpServer);
    this.configureApp();
  }

  private handleRoutes(): void {
    this.app.get("/", (req, res) => {
      res.send(`hello world`);
    });
  }

  private handleSocketConnection(): void {
    this.io.on("connection", (socket) => {
      console.log("Socket connected.");

      socket.on("add-user", (data) => {
        const existingSocket = this.activeSockets.find(
          (existingSocket) => existingSocket.socketId == socket.id
        );
        if (!existingSocket) {
          this.activeSockets.push(data);
          socket.emit("update-user-list", {
            users: this.activeSockets,
          });
          socket.broadcast.emit("update-user-list", {
            users: this.activeSockets,
          });
        }
      });

      socket.on("disconnect", () => {
        this.activeSockets = this.activeSockets.filter(
          (existingSocket) => existingSocket.socketId != socket.id
        );
        socket.broadcast.emit("update-user-list", {
          users: this.activeSockets,
        });
      });
      socket.on("call-user", (data) => {
        socket.to(data.to).emit("call-made", {
          offer: data.offer,
          socket: socket.id,
        });
      });
      socket.on("make-answer", (data) => {
        socket.to(data.to).emit("answer-made", {
          socket: socket.id,
          answer: data.answer,
        });
      });
      socket.on("new-candidate", (data) => {
        socket.to(data.to).emit("candidate-made", {
          candidate: data.candidate,
        });
      });
      socket.on("hang-up", (data) => {
        socket.to(data.to).emit("hang-up-made", {});
      });
    });
  }

  public listen(callback: (port: number) => void): void {
    this.httpServer.listen(this.DEFAULT_PORT, () => {
      callback(this.DEFAULT_PORT);
    });
  }

  private configureApp(): void {
    this.app.use(express.static(path.join(__dirname, "../public")));
  }
}
