"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-02-12 08:08:05
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False, unique=True),
        sa.Column("description", sa.String(), nullable=True),
    )

    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("role_id", sa.Uuid(), sa.ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "drivers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("staff_id", sa.String(), nullable=True, unique=True),
        sa.Column("depot", sa.String(), nullable=True),
        sa.Column("region", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("hours_today", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("hours_week", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("compliance_state", sa.String(), nullable=False, server_default="ok"),
        sa.Column("last_update_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "vehicles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("registration", sa.String(), nullable=False, unique=True),
        sa.Column("fleet_id", sa.String(), nullable=True),
        sa.Column("vehicle_class", sa.String(), nullable=True),
        sa.Column("depot", sa.String(), nullable=True),
        sa.Column("region", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("next_service_date", sa.Date(), nullable=True),
        sa.Column("faults_open", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("compliance_state", sa.String(), nullable=False, server_default="ok"),
        sa.Column("last_update_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("job_code", sa.String(), nullable=False, unique=True),
        sa.Column("priority", sa.String(), nullable=False),
        sa.Column("customer", sa.String(), nullable=False),
        sa.Column("pickup_site", sa.String(), nullable=True),
        sa.Column("drop_site", sa.String(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("eta_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("sla_minutes_total", sa.Integer(), nullable=False, server_default="240"),
        sa.Column("sla_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("driver_id", sa.Uuid(), sa.ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("vehicle_id", sa.Uuid(), sa.ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("exceptions", sa.String(), nullable=True),
        sa.Column("owner_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("last_update_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_jobs_status", "jobs", ["status"])
    op.create_index("ix_jobs_scheduled_at", "jobs", ["scheduled_at"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("alert_type", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("due_by", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_alerts_status", "alerts", ["status"])
    op.create_index("ix_alerts_severity", "alerts", ["severity"])

    op.create_table(
        "audit_log_entries",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("actor_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("before_json", sa.Text(), nullable=True),
        sa.Column("after_json", sa.Text(), nullable=True),
        sa.Column("source", sa.String(), nullable=False, server_default="web"),
        sa.Column("correlation_id", sa.String(), nullable=True),
    )
    op.create_index("ix_audit_ts", "audit_log_entries", ["timestamp"])

    op.create_table(
        "saved_views",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("module", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("filter_json", sa.Text(), nullable=False),
        sa.Column("column_set_json", sa.Text(), nullable=False),
        sa.Column("sort_json", sa.Text(), nullable=False),
        sa.Column("grouping_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "module", "name", name="uq_saved_view_name"),
    )

def downgrade():
    op.drop_table("saved_views")
    op.drop_index("ix_audit_ts", table_name="audit_log_entries")
    op.drop_table("audit_log_entries")
    op.drop_index("ix_alerts_severity", table_name="alerts")
    op.drop_index("ix_alerts_status", table_name="alerts")
    op.drop_table("alerts")
    op.drop_index("ix_jobs_scheduled_at", table_name="jobs")
    op.drop_index("ix_jobs_status", table_name="jobs")
    op.drop_table("jobs")
    op.drop_table("vehicles")
    op.drop_table("drivers")
    op.drop_table("user_roles")
    op.drop_table("roles")
    op.drop_table("users")
