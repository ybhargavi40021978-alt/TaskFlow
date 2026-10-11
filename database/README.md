# TaskFlow Database Documentation & Initialization Guide

This directory houses documentation for the relational data layer of **TaskFlow**. All schema definitions, indexes, relationships, and tables are managed programmatically via **Django ORM migrations** inside the `backend/` directory.

---

## Quick Initialization Instructions

To initialize the database from scratch on a clean clone:

```powershell
# Navigate to backend directory
cd backend

# Create schema migrations (if model changes were made)
python manage.py makemigrations core

# Apply all database migrations to SQLite
python manage.py migrate

# Seed baseline demonstration data (Admin, Users, Projects, Tasks, Comments, Channels)
python manage.py seed_demo_data
```

---

## Seed Accounts Created

Running `python manage.py seed_demo_data` populates the database with:

| Email | Password | Role | Name |
|---|---|---|---|
| `admin@taskflow.dev` | `Admin@12345` | Superuser / Admin | Administrator |
| `alex.morgan@taskflow.dev` | `TaskFlow@123` | Product Lead | Alex Morgan |
| `sarah.wilson@taskflow.dev` | `TaskFlow@123` | Frontend Engineer | Sarah Wilson |
| `marcus.lee@taskflow.dev` | `TaskFlow@123` | Backend Developer | Marcus Lee |

---

## Switching to PostgreSQL for Production

TaskFlow's database architecture is fully portable. To switch from SQLite to PostgreSQL:

1. Install `psycopg2-binary`:
   ```powershell
   pip install psycopg2-binary
   ```
2. Update `backend/config/settings.py` or specify environment variables in `.env`:
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.postgresql',
           'NAME': 'taskflow_db',
           'USER': 'taskflow_user',
           'PASSWORD': 'your_secure_password',
           'HOST': 'localhost',
           'PORT': '5432',
       }
   }
   ```
3. Run `python manage.py migrate`.
