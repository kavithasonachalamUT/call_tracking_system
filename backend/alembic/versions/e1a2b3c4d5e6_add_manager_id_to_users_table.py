"""add manager_id to users table

Revision ID: e1a2b3c4d5e6
Revises: 535088d3d0b6
Create Date: 2026-08-24 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1a2b3c4d5e6'
down_revision = '535088d3d0b6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('manager_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_users_manager_id'), 'users', ['manager_id'], unique=False)
    op.create_foreign_key('fk_users_manager_id_users', 'users', 'users', ['manager_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_users_manager_id_users', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_manager_id'), table_name='users')
    op.drop_column('users', 'manager_id')
