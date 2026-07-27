import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

from backend.app.services.simulation_manager import simulation_manager
from backend.app.services.redis_service import redis_service

logger = logging.getLogger(__name__)
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._redis_listener_task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New client connected. Active connections: {len(self.active_connections)}")
        
        # Send initial full state immediately
        initial_state = simulation_manager.get_current_state_payload()
        await websocket.send_json(initial_state)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to socket: {e}")
                self.disconnect(connection)

    def start_redis_listener(self):
        if not self._redis_listener_task:
            self._redis_listener_task = asyncio.create_task(self._listen_redis_channel())
            logger.info("Started Redis Pub/Sub WebSocket broadcast listener")

    async def _listen_redis_channel(self):
        """Listens for state updates on Redis pub/sub and broadcasts them to all sockets."""
        await redis_service.connect()
        pubsub = redis_service.get_pubsub()
        await pubsub.subscribe("traffic:live")
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    await self.broadcast(data)
        except asyncio.CancelledError:
            logger.info("Redis Pub/Sub listener task cancelled")
        except Exception as e:
            logger.error(f"Error in Redis Pub/Sub listener: {e}", exc_info=True)
            # Reconnect after delay
            await asyncio.sleep(2)
            self._redis_listener_task = asyncio.create_task(self._listen_redis_channel())

manager = ConnectionManager()

@router.websocket("/ws/traffic")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    manager.start_redis_listener()
    try:
        while True:
            # Keep connection alive and listen for client commands (if any)
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                command = payload.get("command")
                if command == "toggle":
                    simulation_manager.toggle_simulation()
                elif command == "set_scenario":
                    scenario_id = payload.get("scenarioId")
                    simulation_manager.set_scenario(scenario_id)
                elif command == "override_emergency":
                    lane_id = payload.get("laneId")
                    simulation_manager.trigger_emergency_override(lane_id)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
