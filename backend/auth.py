
import os
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from database import get_connection

router = APIRouter(prefix="/auth", tags=["Authentication"])
password_hasher = PasswordHash.recommended()

SECRET_KEY = os.getenv("DSIGNORA_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "Set the DSIGNORA_SECRET_KEY environment variable before starting the API."
    )

ALGORITHM = "HS256"

VALID_ROLES = {"sign_language", "hearing"}


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="sign_language")


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1, max_length=128)


def create_access_token(user_id: int, email: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=2)

    return jwt.encode(
        {
            "sub": str(user_id),
            "email": email,
            "exp": expires,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


@router.post("/register", status_code=201)
def register(payload: RegisterRequest):
    name = payload.full_name.strip()
    email = payload.email.strip().lower()
    role = payload.role.strip().lower()

    if len(name) < 2 or "@" not in email:
        raise HTTPException(
            status_code=400,
            detail="Enter a valid name and email.",
        )

    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=400,
            detail="Role must be sign_language or hearing.",
        )

    password_hash = password_hasher.hash(payload.password)
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users
                    (full_name, email, password_hash, role)
                VALUES (%s, %s, %s, %s)
                """,
                (name, email, password_hash, role),
            )
            user_id = cursor.lastrowid

        connection.commit()

        return {
            "message": "Registration successful",
            "user": {
                "id": user_id,
                "full_name": name,
                "email": email,
                "role": role,
            },
        }

    except Exception as exc:
        connection.rollback()

        # MySQL duplicate-entry error.
        if getattr(exc, "args", [None])[0] == 1062:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            ) from exc

        raise

    finally:
        connection.close()


@router.post("/login")
def login(payload: LoginRequest):
    email = payload.email.strip().lower()
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, full_name, email, password_hash, role
                FROM users
                WHERE email = %s
                """,
                (email,),
            )
            user = cursor.fetchone()
    finally:
        connection.close()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    try:
        password_valid = password_hasher.verify(
            payload.password,
            user["password_hash"],
        )
    except Exception:
        password_valid = False

    if not password_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    # Handle legacy accounts with an empty or missing role safely.
    role = (user.get("role") or "sign_language").strip().lower()

    if role not in VALID_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Your account has an invalid role. Contact the administrator.",
        )

    token = create_access_token(user["id"], user["email"])

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "role": role,
        },
    }
