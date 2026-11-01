from contextlib import asynccontextmanager
from pathlib import Path
import logging

import httpx
import jwt
from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from auth import ALGORITHM, SECRET_KEY, router as auth_router
from database import get_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dsignora")

# This file is backend/main.py. Model files are expected in the project root.
ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "sign_alphabet_mob_model.keras"
CLASS_PATH = ROOT / "class_indices_mob.npy"
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"

# Loaded during application startup so startup failures have a useful traceback.
cv2 = None
mp = None
np = None
tf = None
preprocess_input = None
model = None
labels = {}
hand_detector = None
model_load_error = None


def load_labels(data):
    """Convert common class-index formats to index -> label."""
    if isinstance(data, dict):
        if all(isinstance(value, (int,)) or type(value).__module__ == "numpy" for value in data.values()):
            try:
                return {int(index): str(label) for label, index in data.items()}
            except (TypeError, ValueError):
                pass
        if all(str(key).isdigit() for key in data.keys()):
            return {int(index): str(label) for index, label in data.items()}

    if isinstance(data, (list, tuple)) or (np is not None and isinstance(data, np.ndarray)):
        return {index: str(label) for index, label in enumerate(data)}

    raise ValueError(
        "Unsupported class_indices_mob.npy format. Check the original class mapping."
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load AI dependencies at startup and report clear errors if unavailable."""
    global cv2, mp, np, tf, preprocess_input, model, labels, hand_detector, model_load_error

    try:
        import cv2 as _cv2
        import mediapipe as _mp
        import numpy as _np
        import tensorflow as _tf
        from tensorflow.keras.applications.mobilenet_v2 import preprocess_input as _preprocess_input

        cv2, mp, np, tf = _cv2, _mp, _np, _tf
        preprocess_input = _preprocess_input

        if not MODEL_PATH.is_file():
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
        if not CLASS_PATH.is_file():
            raise FileNotFoundError(f"Class-label file not found: {CLASS_PATH}")

        logger.info("Loading DSignora model from %s", MODEL_PATH)
        model = tf.keras.models.load_model(MODEL_PATH)

        class_data = np.load(CLASS_PATH, allow_pickle=True)
        if class_data.shape == ():
            class_data = class_data.item()
        else:
            class_data = class_data.tolist()

        labels = load_labels(class_data)
        output_shape = model.output_shape
        if not output_shape or len(labels) != int(output_shape[-1]):
            raise ValueError(
                f"Class label count ({len(labels)}) does not match model output count "
                f"({output_shape[-1] if output_shape else 'unknown'})."
            )

        hand_detector = mp.solutions.hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.55,
            min_tracking_confidence=0.5,
        )
        logger.info("DSignora AI model loaded successfully (%d labels).", len(labels))
    except Exception as exc:
        model_load_error = f"{type(exc).__name__}: {exc}"
        logger.exception("DSignora AI startup failed while loading AI dependencies/model")
        # Let the app start so /health can report the problem instead of hiding it.
        model = None
        hand_detector = None

    yield

    if hand_detector is not None:
        try:
            hand_detector.close()
        except Exception:
            logger.exception("Could not close MediaPipe hand detector")


app = FastAPI(title="DSignora AI API", version="1.0.0", lifespan=lifespan)
app.include_router(auth_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CorrectTextRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=3000,
        description="Text from sign recognition that needs correction.",
        examples=["hheelllloo hhoww aarree yyouu"],
    )


class HistoryRequest(BaseModel):
    original_text: str = Field(..., min_length=1, max_length=3000)
    corrected_text: str = Field(..., min_length=1, max_length=3000)


def require_model():
    if model is None or cv2 is None or np is None or hand_detector is None:
        detail = "AI model is not ready. Check backend terminal logs and model dependencies."
        if model_load_error:
            detail += f" Startup detail: {model_load_error}"
        raise HTTPException(status_code=503, detail=detail)


def prepare_hand_image(frame):
    """Detect hands and prepare a 224x224 RGB image for MobileNetV2."""
    height, width = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hand_detector.process(rgb)
    if not result.multi_hand_landmarks:
        return None

    xs, ys = [], []
    for hand in result.multi_hand_landmarks:
        for point in hand.landmark:
            xs.append(int(point.x * width))
            ys.append(int(point.y * height))

    x_min, x_max = max(0, min(xs)), min(width, max(xs) + 1)
    y_min, y_max = max(0, min(ys)), min(height, max(ys) + 1)
    pad_x = int((x_max - x_min) * 0.20)
    pad_y = int((y_max - y_min) * 0.20)
    x_min, x_max = max(0, x_min - pad_x), min(width, x_max + pad_x)
    y_min, y_max = max(0, y_min - pad_y), min(height, y_max + pad_y)

    crop = frame[y_min:y_max, x_min:x_max]
    if crop.size == 0:
        return None

    crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    crop_h, crop_w = crop_rgb.shape[:2]
    scale = 224 / max(crop_h, crop_w)
    new_w = max(1, int(crop_w * scale))
    new_h = max(1, int(crop_h * scale))
    resized = cv2.resize(crop_rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)

    canvas = np.zeros((224, 224, 3), dtype=np.uint8)
    offset_x = (224 - new_w) // 2
    offset_y = (224 - new_h) // 2
    canvas[offset_y:offset_y + new_h, offset_x:offset_x + new_w] = resized

    image = canvas.astype(np.float32)
    image = preprocess_input(image)
    return np.expand_dims(image, axis=0)


@app.get("/")
def home():
    return {
        "application": "DSignora AI",
        "message": "Sign Language Recognition API is running",
        "model_loaded": model is not None,
        "ollama_model": OLLAMA_MODEL,
    }


@app.get("/health")
def health():
    ready = model is not None
    return {
        "status": "ok" if ready else "degraded",
        "model_loaded": ready,
        "model_load_error": model_load_error,
        "model_input_shape": str(model.input_shape) if model is not None else None,
        "model_output_shape": str(model.output_shape) if model is not None else None,
        "number_of_labels": len(labels),
        "ollama_model": OLLAMA_MODEL,
    }


@app.post("/predict")
async def predict(request: Request):
    require_model()
    image_bytes = await request.body()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="No image received.")

    array = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image. Send an encoded image.")

    try:
        prepared = prepare_hand_image(frame)
        if prepared is None:
            return {"hand_detected": False, "letter": "", "confidence": 0.0}

        predictions = model.predict(prepared, verbose=0)[0]
        predicted_index = int(np.argmax(predictions))
        confidence = float(predictions[predicted_index])
        label = labels.get(predicted_index)
        if label is None:
            raise ValueError(f"No label found for output index {predicted_index}.")

        return {
            "hand_detected": True,
            "letter": str(label).strip(),
            "confidence": round(confidence * 100, 2),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc


@app.post("/correct-text")
async def correct_text(payload: CorrectTextRequest):
    raw_text = payload.text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Please provide text to correct.")

    prompt = f"""You are the text correction assistant for DSignora AI, a sign-language recognition application.
The input comes from a sign recognition system and may contain incorrectly recognized letters, repeated characters, missing spaces, spelling mistakes, grammar errors, or punctuation errors.
Correct obvious errors, separate words where appropriate, use natural readable English, preserve the intended meaning, do not invent details, and return only the corrected text without explanations.

Input text:
{raw_text}

Corrected text:
"""
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0},
                },
            )
            response.raise_for_status()
            result = response.json()

        corrected = str(result.get("response", "")).strip()
        if not corrected:
            raise HTTPException(status_code=502, detail="Ollama returned an empty correction.")
        return {"original_text": raw_text, "corrected_text": corrected, "model": OLLAMA_MODEL}
    except HTTPException:
        raise
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Ollama took too long to respond. Please try again.") from exc
    except httpx.HTTPError as exc:
        logger.exception("Ollama request failed")
        raise HTTPException(
            status_code=502,
            detail="Could not connect to Ollama. Ensure Ollama is running and the configured model is installed.",
        ) from exc


history_security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(history_security),
):
    """Validate the login token and return its user ID."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Please log in to access translation history.")
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token. Please log in again.",
        ) from exc
    return user_id


@app.post("/history", status_code=201, tags=["Translation History"])
def save_history(payload: HistoryRequest, user_id: int = Depends(get_current_user)):
    """Save a translation for the authenticated user."""
    original = payload.original_text.strip()
    corrected = payload.corrected_text.strip()
    if not original or not corrected:
        raise HTTPException(status_code=400, detail="Original and corrected text cannot be empty.")

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            if cursor.fetchone() is None:
                raise HTTPException(status_code=401, detail="User account not found. Please log in again.")
            cursor.execute(
                """INSERT INTO translation_history (user_id, original_text, corrected_text)
                   VALUES (%s, %s, %s)""",
                (user_id, original, corrected),
            )
            history_id = cursor.lastrowid
        connection.commit()
        return {"message": "Translation saved successfully", "history_id": history_id}
    except HTTPException:
        connection.rollback()
        raise
    except Exception as exc:
        connection.rollback()
        logger.exception("Could not save translation history")
        raise HTTPException(status_code=500, detail="Could not save translation history.") from exc
    finally:
        connection.close()


@app.get("/history", tags=["Translation History"])
def get_history(user_id: int = Depends(get_current_user)):
    """Return only the authenticated user's translation records."""
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """SELECT id, original_text, corrected_text, created_at
                   FROM translation_history
                   WHERE user_id = %s
                   ORDER BY created_at DESC, id DESC""",
                (user_id,),
            )
            records = cursor.fetchall()
        return {
            "history": [
                {
                    "id": record["id"],
                    "original_text": record["original_text"],
                    "corrected_text": record["corrected_text"],
                    "created_at": record["created_at"],
                }
                for record in records
            ]
        }
    except Exception as exc:
        logger.exception("Could not retrieve translation history")
        raise HTTPException(status_code=500, detail="Could not retrieve translation history.") from exc
    finally:
        connection.close()
# ---------------- VIDEO CALL SIGNALING ----------------

import asyncio
import json

from fastapi import WebSocket, WebSocketDisconnect


# Each room supports two participants for the demo.
call_rooms: dict[str, set[WebSocket]] = {}
call_rooms_lock = asyncio.Lock()


@app.websocket("/ws/call/{room_id}")
async def video_call_signaling(websocket: WebSocket, room_id: str):
    room_id = room_id.strip()

    if not room_id or len(room_id) > 80:
        await websocket.close(code=1008, reason="Invalid room ID")
        return

    await websocket.accept()

    async with call_rooms_lock:
        participants = call_rooms.setdefault(room_id, set())

        if len(participants) >= 2:
            if not participants:
                call_rooms.pop(room_id, None)

            await websocket.send_json({
                "type": "room-full",
                "message": "This room already has two participants."
            })
            await websocket.close(code=1008, reason="Room is full")
            return

        existing_participants = list(participants)
        participants.add(websocket)

    try:
        await websocket.send_json({
            "type": "joined",
            "room_id": room_id,
            "peer_present": bool(existing_participants)
        })

        # Tell the existing participant that someone has joined.
        for peer in existing_participants:
            await peer.send_json({"type": "peer-joined"})

        # Relay WebRTC offer, answer, and ICE messages.
        while True:
            message_text = await websocket.receive_text()

            try:
                message = json.loads(message_text)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON message."
                })
                continue

            if not isinstance(message, dict):
                continue

            if message.get("type") not in {"offer", "answer", "ice-candidate"}:
                continue

            async with call_rooms_lock:
                peers = list(call_rooms.get(room_id, set()) - {websocket})

            for peer in peers:
                try:
                    await peer.send_json(message)
                except (RuntimeError, WebSocketDisconnect):
                    pass

    except WebSocketDisconnect:
        pass

    except Exception:
        logger.exception("Video-call signaling error in room %s", room_id)

    finally:
        async with call_rooms_lock:
            participants = call_rooms.get(room_id, set())
            participants.discard(websocket)

            if not participants:
                call_rooms.pop(room_id, None)
            else:
                for peer in list(participants):
                    try:
                        await peer.send_json({"type": "peer-left"})
                    except (RuntimeError, WebSocketDisconnect):
                        pass