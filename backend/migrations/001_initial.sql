-- RecallX v1 initial SQLite schema. SQLAlchemy metadata is the source of truth.
PRAGMA foreign_keys=ON;


CREATE TABLE users (
	email VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	password_hash VARCHAR NOT NULL, 
	role VARCHAR NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (email)
)

;


CREATE TABLE alerts (
	patient_id INTEGER NOT NULL, 
	caregiver_id INTEGER NOT NULL, 
	type VARCHAR NOT NULL, 
	title VARCHAR NOT NULL, 
	message VARCHAR NOT NULL, 
	severity VARCHAR NOT NULL, 
	read BOOLEAN NOT NULL, 
	source_key VARCHAR NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id), 
	FOREIGN KEY(caregiver_id) REFERENCES users (id), 
	UNIQUE (source_key)
)

;

CREATE INDEX ix_alerts_patient_id ON alerts (patient_id);

CREATE INDEX ix_alerts_caregiver_id ON alerts (caregiver_id);


CREATE TABLE caregiver_profiles (
	user_id INTEGER NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
)

;


CREATE TABLE family_members (
	patient_id INTEGER NOT NULL, 
	name VARCHAR NOT NULL, 
	relation VARCHAR NOT NULL, 
	photo VARCHAR NOT NULL, 
	memory_note VARCHAR NOT NULL, 
	important_facts VARCHAR NOT NULL, 
	active BOOLEAN NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
)

;

CREATE INDEX ix_family_members_patient_id ON family_members (patient_id);


CREATE TABLE game_sessions (
	patient_id INTEGER NOT NULL, 
	event_id VARCHAR NOT NULL, 
	game_type VARCHAR NOT NULL, 
	difficulty VARCHAR NOT NULL, 
	score FLOAT NOT NULL, 
	accuracy FLOAT NOT NULL, 
	response_time FLOAT NOT NULL, 
	mistakes INTEGER NOT NULL, 
	hints_used INTEGER NOT NULL, 
	moves INTEGER NOT NULL, 
	started_at VARCHAR NOT NULL, 
	completed_at VARCHAR NOT NULL, 
	completion_status VARCHAR NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id), 
	UNIQUE (event_id)
)

;

CREATE INDEX ix_game_sessions_patient_id ON game_sessions (patient_id);


CREATE TABLE medications (
	patient_id INTEGER NOT NULL, 
	medicine_name VARCHAR NOT NULL, 
	dosage VARCHAR NOT NULL, 
	instructions VARCHAR NOT NULL, 
	scheduled_time VARCHAR NOT NULL, 
	repeat_rule VARCHAR NOT NULL, 
	grace_period_minutes INTEGER NOT NULL, 
	active BOOLEAN NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
)

;

CREATE INDEX ix_medications_patient_id ON medications (patient_id);


CREATE TABLE patient_caregiver_links (
	patient_id INTEGER NOT NULL, 
	caregiver_id INTEGER NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (patient_id, caregiver_id), 
	FOREIGN KEY(patient_id) REFERENCES users (id), 
	FOREIGN KEY(caregiver_id) REFERENCES users (id)
)

;

CREATE INDEX ix_patient_caregiver_links_patient_id ON patient_caregiver_links (patient_id);

CREATE INDEX ix_patient_caregiver_links_caregiver_id ON patient_caregiver_links (caregiver_id);


CREATE TABLE patient_profiles (
	user_id INTEGER NOT NULL, 
	timezone VARCHAR NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
)

;


CREATE TABLE progress_metrics (
	patient_id INTEGER NOT NULL, 
	date VARCHAR NOT NULL, 
	accuracy FLOAT NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
)

;

CREATE INDEX ix_progress_metrics_patient_id ON progress_metrics (patient_id);


CREATE TABLE routine_tasks (
	patient_id INTEGER NOT NULL, 
	title VARCHAR NOT NULL, 
	description VARCHAR NOT NULL, 
	category VARCHAR NOT NULL, 
	scheduled_time VARCHAR NOT NULL, 
	repeat_rule VARCHAR NOT NULL, 
	priority VARCHAR NOT NULL, 
	active BOOLEAN NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES users (id)
)

;

CREATE INDEX ix_routine_tasks_patient_id ON routine_tasks (patient_id);


CREATE TABLE user_settings (
	user_id INTEGER NOT NULL, 
	language VARCHAR NOT NULL, 
	text_size VARCHAR NOT NULL, 
	voice BOOLEAN NOT NULL, 
	notifications BOOLEAN NOT NULL, 
	reduced_motion BOOLEAN NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (user_id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
)

;


CREATE TABLE game_attempts (
	session_id INTEGER NOT NULL, 
	person_id INTEGER, 
	correct BOOLEAN NOT NULL, 
	response_time FLOAT NOT NULL, 
	hints_used INTEGER NOT NULL, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(session_id) REFERENCES game_sessions (id), 
	FOREIGN KEY(person_id) REFERENCES family_members (id)
)

;

CREATE INDEX ix_game_attempts_session_id ON game_attempts (session_id);


CREATE TABLE medication_logs (
	medication_id INTEGER NOT NULL, 
	date VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	due_at VARCHAR NOT NULL, 
	deadline VARCHAR NOT NULL, 
	taken_at VARCHAR, 
	snoozed_until VARCHAR, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (medication_id, date), 
	FOREIGN KEY(medication_id) REFERENCES medications (id)
)

;

CREATE INDEX ix_medication_logs_medication_id ON medication_logs (medication_id);


CREATE TABLE routine_logs (
	task_id INTEGER NOT NULL, 
	date VARCHAR NOT NULL, 
	status VARCHAR NOT NULL, 
	completed_at VARCHAR, 
	id INTEGER NOT NULL, 
	created_at VARCHAR NOT NULL, 
	updated_at VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (task_id, date), 
	FOREIGN KEY(task_id) REFERENCES routine_tasks (id)
)

;

CREATE INDEX ix_routine_logs_task_id ON routine_logs (task_id);