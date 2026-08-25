"""add phone to users table

Revision ID: f2b3c4d5e6a7
Revises: e1a2b3c4d5e6
Create Date: 2026-08-25 12:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f2b3c4d5e6a7'
down_revision = 'e1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(length=30), nullable=True))
    op.create_index(op.f('ix_users_phone'), 'users', ['phone'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_phone'), table_name='users')
    op.drop_column('users', 'phone')
