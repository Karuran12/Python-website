from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import Query
from pydantic import BaseModel
from passlib.context import CryptContext
from typing import Optional
from datetime import datetime, timedelta
from database import get_db_connection
import jwt
import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajuster en prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Clé secrète pour JWT
SECRET_KEY = os.getenv("SECRET_KEY", "secret")
ALGORITHM = "HS256"

# Modèles Pydantic
class Utilisateur(BaseModel):
    nom: str
    email: str
    motdepasse: str
    role: str = "candidat"

class UtilisateurLogin(BaseModel):
    email: str
    motdepasse: str

# Hashage mot de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Connexion MySQL
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            database="jobai",
            user=os.getenv("DB_USERNAME") or "root",
            password=os.getenv("DB_PASSWORD") or ""
        )
        return conn
    except Error as e:
        print(f"Erreur connexion MySQL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur de connexion à la base de données"
        )

# Création token JWT
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dépendance pour extraire token et vérifier
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="connexion")

def decode_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        return email
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

# Routes

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API JobAI!"}

@app.post("/inscription")
async def inscription(user: Utilisateur):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Vérifier si email existe
        cursor.execute("SELECT * FROM utilisateurs WHERE email = %s", (user.email,))
        existing_user = cursor.fetchone()
        if existing_user:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

        hashed_password = hash_password(user.motdepasse)

        cursor.execute(
            "INSERT INTO utilisateurs (nom, email, motdepasse, role) VALUES (%s, %s, %s, %s)",
            (user.nom, user.email, hashed_password, user.role)
        )
        user_id = cursor.lastrowid

        cursor.execute("SELECT id, nom, email, role FROM utilisateurs WHERE id = %s", (user_id,))
        new_user = cursor.fetchone()

        conn.commit()

        access_token = create_access_token(data={"sub": user.email})

        return {
            "message": f"Bienvenue {user.nom} !",
            "user": new_user,
            "access_token": access_token,
            "token_type": "bearer"
        }
    except Error as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur MySQL: {e}")
    finally:
        if cursor: cursor.close() if cursor else None
        if conn: conn.close() if conn else None

@app.post("/connexion")
async def connexion(user: UtilisateurLogin):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM utilisateurs WHERE email = %s", (user.email,))
        db_user = cursor.fetchone()

        if not db_user or not verify_password(user.motdepasse, db_user["motdepasse"]):
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

        access_token = create_access_token(data={"sub": db_user["email"]})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": db_user["id"],
                "nom": db_user["nom"],
                "email": db_user["email"],
                "role": db_user["role"]
            }
        }
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Erreur MySQL: {e}")
    finally:
        if cursor: cursor.close() if cursor else None
        if conn: conn.close() if conn else None

@app.post("/profil")
async def update_profil(
    nom: str = Form(...),
    titre: Optional[str] = Form(None),
    competences: Optional[str] = Form(None),
    experience: Optional[str] = Form(None),
    formation: Optional[str] = Form(None),
    recherche: Optional[str] = Form(None),
    cv: Optional[UploadFile] = File(None),
    lettre_motivation: Optional[UploadFile] = File(None),
    email: str = Depends(decode_token)
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)

        file_paths = {}

        # Sauvegarder les fichiers uploadés
        if cv:
            cv_path = os.path.join(upload_dir, f"{email}_cv_{cv.filename}")
            with open(cv_path, "wb") as f:
                f.write(await cv.read())
            file_paths["cv_path"] = cv_path

        if lettre_motivation:
            lettre_path = os.path.join(upload_dir, f"{email}_lettre_motivation_{lettre_motivation.filename}")
            with open(lettre_path, "wb") as f:
                f.write(await lettre_motivation.read())
            file_paths["lettre_motivation_path"] = lettre_path

        # Construction dynamique de la requête UPDATE
        update_fields = {
            "nom": nom,
            "titre": titre,
            "competences": competences,
            "experience": experience,
            "formation": formation,
            "recherche": recherche,
        }
        update_fields.update(file_paths)

        set_clause = ", ".join([f"{key} = %({key})s" for key in update_fields.keys()])
        update_query = f"UPDATE utilisateurs SET {set_clause} WHERE email = %(email)s"

        update_fields["email"] = email

        cursor.execute(update_query, update_fields)
        conn.commit()

        cursor.execute("SELECT id, nom, email, role, titre, competences, experience, formation, recherche, cv_path, lettre_motivation_path FROM utilisateurs WHERE email = %s", (email,))
        updated_user = cursor.fetchone()

        return {"message": "Profil mis à jour avec succès", "user": updated_user}
    except Error as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur MySQL: {e}")
    finally:
        if cursor: cursor.close() if cursor else None
        if conn: conn.close() if conn else None 

@app.get("/offres")
def get_offres(
    search: str = Query("", alias="search"),
    lieu: str = Query("", alias="lieu"),
    type_contrat: str = Query("", alias="type_contrat"),
    compatibilite: int = Query(0, alias="compatibilite")
):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = "SELECT * FROM offres_emploi WHERE 1=1"
    params = []

    if search:
        query += " AND (titre LIKE %s OR description LIKE %s OR entreprise LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like, like])

    if lieu:
        query += " AND lieu = %s"
        params.append(lieu)

    if type_contrat:
        query += " AND type_contrat = %s"
        params.append(type_contrat)

    if compatibilite:
        query += " AND compatibilite >= %s"
        params.append(compatibilite)

    query += " ORDER BY compatibilite DESC"

    cursor.execute(query, params)
    results = cursor.fetchall()
    conn.close()

    for offre in results:
        if "date_publication" in offre and isinstance(offre["date_publication"], datetime):
            offre["date_publication"] = offre["date_publication"].strftime('%Y-%m-%d')
        elif not offre.get("date_publication"):
            offre["date_publication"] = datetime.utcnow().strftime('%Y-%m-%d')


    return JSONResponse(content={"offres": results})

@app.get("/offres-filtres")
def get_filtres():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT DISTINCT lieu FROM offres_emploi WHERE lieu IS NOT NULL")
    lieux = sorted([row[0] for row in cursor.fetchall()])

    cursor.execute("SELECT DISTINCT type_contrat FROM offres_emploi WHERE type_contrat IS NOT NULL")
    contrats = sorted([row[0] for row in cursor.fetchall()])

    conn.close()

    return {
        "lieux": lieux,
        "contrats": contrats
    }

@app.get("/entreprises")
def get_entreprises():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT entreprise FROM offres_emploi WHERE entreprise IS NOT NULL")
    entreprises = [row[0] for row in cursor.fetchall()]
    conn.close()
    return {"entreprises": entreprises}

@app.get("/offres-recentes")
def get_recent_offres():
    conn = connect_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT poste, nom_entreprise, lieu, type_contrat, compatibilite
        FROM offre
        ORDER BY id DESC
        LIMIT 8
    """)
    offres = cursor.fetchall()
    conn.close()
    return {"offres": offres}
