import json
import logging
import redis.asyncio as aioredis
from typing import Optional, Any
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class RedisService:
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self._redis: Optional[aioredis.Redis] = None

    async def connect(self):
        if not self._redis:
            self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
            logger.info("Connected to Redis")

    async def disconnect(self):
        if self._redis:
            await self._redis.close()
            self._redis = None
            logger.info("Disconnected from Redis")

    async def set_cache(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
        await self.connect()
        try:
            serialized = json.dumps(value)
            await self._redis.set(key, serialized, ex=expire_seconds)
            return True
        except Exception as e:
            logger.error(f"Redis set_cache error: {e}")
            return False

    async def get_cache(self, key: str) -> Optional[Any]:
        await self.connect()
        try:
            data = await self._redis.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Redis get_cache error: {e}")
        return None

    async def delete_cache(self, key: str) -> bool:
        await self.connect()
        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis delete_cache error: {e}")
            return False

    async def publish(self, channel: str, message: Any) -> int:
        await self.connect()
        try:
            serialized = json.dumps(message)
            return await self._redis.publish(channel, serialized)
        except Exception as e:
            logger.error(f"Redis publish error to {channel}: {e}")
            return 0

    def get_pubsub(self) -> aioredis.client.PubSub:
        if not self._redis:
            raise RuntimeError("Redis client is not connected. Call connect() first.")
        return self._redis.pubsub()

redis_service = RedisService()
