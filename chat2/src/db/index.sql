CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    username VARCHAR(250) NOT NULL
);

INSERT INTO users(username) VALUES('A')

CREATE TABLE messages(
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(id),
    receiver_id INT REFERENCES users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);